//必要となるライブラリ
const { Client, EmbedBuilder, Events, GatewayIntentBits, ActivityType, WebhookClient } = require("./node_modules/discord.js");
require('./node_modules/dotenv').config();
const fs = require("./node_modules/fs-extra");
const { tools, auth, v2 } = require("./node_modules/osu-api-extended");
const axios = require("./node_modules/axios");
const { Beatmap, Calculator } = require("./node_modules/rosu-pp-nodev");
const asciify = require("./node_modules/asciify");
const { Readable } = require("node:stream");
const path = require('node:path');
const osuLibrary = require("./src/library.js");

const apikey = process.env.APIKEY;
const token = process.env.TOKEN;
const osuclientid = process.env.CLIENTID;
const osuclientsecret = process.env.CLIENTSECRET;
const hypixelapikey = process.env.HYPIXELAPI;
const BotadminId = process.env.BOTADMINID;
const Furrychannel = process.env.FURRYCHANNEL;

const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
		GatewayIntentBits.GuildMembers
	]
});

client.on(Events.ClientReady, async () =>
	{
		asciify("Hoshino Bot", { font: "larry3d" }, (err, msg) => {
			if(err) return;
			console.log(msg);
		});
		client.user.setPresence({
			activities: [{
				name: "ほしのBot Ver1.1.0を起動中",
				type: ActivityType.Playing
			}]
		});
		setInterval(checkMap, 60000);
		let lastDate = new Date().getDate();
		setInterval(async () => {
			const currentDate = new Date().getDate();
			if (currentDate !== lastDate) {
				lastDate = currentDate;
				await rankedintheday();
				process.exit(0);
			}
		}, 1000);

		setInterval(() => {
			client.user.setPresence({
				activities: [{
					name: `h!help | ping: ${client.ws.ping}`,
					type: ActivityType.Playing
				}]
			});
		}, 5000);
		setInterval(makeBackup, 3600000);

		(async () => {
			const webHookData = JSON.parse(fs.readFileSync("./ServerDatas/WebHookData.json", "utf-8"));
			if (webHookData.lastDate == new Date().getDate()) return;
			const webHookClient = new WebhookClient({ url: process.env.WEBHOOKURL });
			const today = new Date();
			const sixAM = new Date(today);
			sixAM.setHours(6, 0, 0, 0);
			const sixPM = new Date(today);
			sixPM.setHours(18, 0, 0, 0);
			const timeDiff = sixPM - sixAM;
			const randomTime = sixAM.getTime() + Math.random() * timeDiff;
			const nextExecutionTime = new Date(randomTime);
			const currentTime = new Date();
			const timeUntilNextExecution = nextExecutionTime - currentTime;
			if (timeUntilNextExecution > 0) {
				setTimeout(async () => {
					if (webHookData.lastDate == new Date().getDate()) return;
					await webHookClient.send({
						content: "daily bread"
					})
						.then(() => {
							console.log("WebHookの送信に成功しました。");
							webHookData.lastDate = new Date().getDate();
							fs.writeFileSync("./ServerDatas/WebHookData.json", JSON.stringify(webHookData, null, 4), "utf-8");
						})
						.catch(() => {
							console.log("WebHookの送信に失敗しました。");
						});
				}, timeUntilNextExecution);
			}
		})();
	}
);

const symbols = ['🍒', '🍊', '🍇', '🔔', '💰', '⌚', '⛵'];

client.on(Events.InteractionCreate, async (interaction) =>
	{
		try {
			if (!interaction.isCommand()) return;
			if (interaction.commandName == "slot") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				let betAmount = interaction.options.get('betamount').value;
				if (!(/^\d+$/.test(betAmount))) {
					await interaction.reply("数字のみ入力するようにしてください。");
					return;
				}

				betAmount = BigInt(betAmount);

				const currentBalance = BigInt(bankData[interaction.user.id].balance);
				const newBalance = currentBalance - betAmount;

				if (newBalance <= 0n) {
					await interaction.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`);
					return;
				}

				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier;
				const resultprefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeFileSync("./ServerDatas/UserBankData.json", JSON.stringify(bankData, null, 4), "utf-8");
				return;
			}

			if (interaction.commandName == "safeslot") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				let betAmount = interaction.options.get('betamount').value;
				if (!(/^\d+$/.test(betAmount))) {
					await interaction.reply("数字のみ入力するようにしてください。");
					return;
				}

				betAmount = BigInt(betAmount);

				const currentBalance = BigInt(bankData[interaction.user.id].balance);
				const newBalance = currentBalance - betAmount;

				if (newBalance <= 0n) {
					await interaction.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`);
					return;
				}

				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				const reward = rewardMultiplier == 0n ? betAmount * 2n * 10n / 100n : betAmount * rewardMultiplier * 7n * 10n / 100n;
				const resultPrefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultPrefix}${formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeFileSync("./ServerDatas/UserBankData.json", JSON.stringify(bankData, null, 4), "utf-8");
				return;
			}

			if (interaction.commandName == "bankranking") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				let bankDataArray = [];
				for (const key in bankData) {
					bankDataArray.push(bankData[key]);
				}
				bankDataArray.sort((a, b) => b.balance.length - a.balance.length);
				let ranking = [];
				for (let i = 0; i < Math.min(bankDataArray.length, 10); i++) {
					ranking.push(`- __#**${i + 1}**__: **${bankDataArray[i].username}** (__*${bankDataArray[i].balance.length}桁*__)`);
				}
				await interaction.reply(`__**Current Bank digits Ranking**__\n${ranking.join('\n')}`);
				return;
			}

			if (interaction.commandName == "lv") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}
				const balance = BigInt(bankData[interaction.user.id].balance);
				let currentrank = 0;
				let nextbalance = 0n;
				for (let i = 1n ; i <= 300n; i += 1n) {
					if (balance / BigInt(120n ** i) < 1n && currentrank == 0) {
						await interaction.reply("あなたの現在のレベルは**__0lv__**以下です。");
						return;
					} else if (balance / BigInt(120n ** i) >= 1n) {
						currentrank += 1;
						nextbalance = BigInt(120n ** (i + 1n));
					}
				}
				await interaction.reply(`あなたの現在のレベルは **__${currentrank}lv__** / 300 (次のレベル => **${formatBigInt(nextbalance)}**coins)`);
				return;
			}

			if (interaction.commandName == "recoshot") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				const balance = BigInt(bankData[interaction.user.id].balance);

				if (balance <= 100000000000000000000000000000000000n) {
					await interaction.reply("このコマンドを使うには、1000溝以上のお金が銀行口座にある必要があります。");
					return;
				}

				if (balance <= 0n) {
					await interaction.reply("賭け金額を計算できるほどのお金を持っていないようです。");
					return;
				}

				const betAmount = balance / 15n;
				const newBalance = balance - betAmount;
				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier * 8n * 10n / 100n;
				const resultprefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeFileSync("./ServerDatas/UserBankData.json", JSON.stringify(bankData, null, 4), "utf-8");
				return;
			}

			if (interaction.commandName == "reco") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				const balance = BigInt(bankData[interaction.user.id].balance);
				if (balance <= 0n) {
					await interaction.reply("賭け金額を計算できるほどのお金を持っていないようです。");
					return;
				}
				const recommend = (balance / 15n).toString();
				await interaction.reply(`おすすめのslot賭け金: ${recommend}\nコマンド: /slot ${recommend}`);
				return;
			}

			if (interaction.commandName == "bank") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				const currentbank = bankData[interaction.user.id].balance;
				await interaction.reply(`${interaction.user.username}の現在の銀行口座残高: \n ${formatBigInt(currentbank)} (${toJPUnit(currentbank)}) coins`);
				return;
			}

			if (interaction.commandName == "amount") {
				const amount = interaction.options.get('amount').value;
				if (!(/^\d+$/.test(amount))) {
					await interaction.reply("数字のみ入力するようにしてください。");
					return;
				}
				await interaction.reply(toJPUnit(amount));
				return;
			}

			if (interaction.commandName == "regcasino") {
				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (bankData[interaction.user.id]) {
					await interaction.reply("あなたはもう既にこのカジノに登録されています。");
					return;
				}

				bankData[interaction.user.id] = {
					username: interaction.user.username,
					balance: "1000000"
				};

				fs.writeFileSync("./ServerDatas/UserBankData.json", JSON.stringify(bankData, null, 4), "utf-8");
				await interaction.reply(`カジノへようこそ ${interaction.user.username}! 初回なので1000000コインを差し上げます。`);
				return;
			}

			if (interaction.commandName == "send") {
				const sentusername = interaction.options.get('username').value;
				if (sentusername == interaction.user.username) {
					await interaction.reply("自分自身に送ることは許されていません！");
					return;
				}

				const bankData = JSON.parse(fs.readFileSync("./ServerDatas/UserBankData.json", "utf-8"));
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				let isSentUserRegistered = false;
				for (const key in bankData) {
					if (bankData[key].username == sentusername) {
						isSentUserRegistered = true;
						break;
					}
				}

				if (!isSentUserRegistered) {
					await interaction.reply(`${sentusername} というユーザーはこのカジノに登録されていません。`);
					return;
				}

				const amount = interaction.options.get('amount').value;
				if (!(/^\d+$/.test(amount))) {
					await interaction.reply("数字のみ入力するようにしてください。");
					return;
				}

				const sentMoney = BigInt(amount);
				if (sentMoney <= 0n) {
					await interaction.reply("送る金額を0以下にすることは出来ません。");
					return;
				}

				const messagerCurrentBalance = BigInt(bankData[interaction.user.id].balance);
				if (messagerCurrentBalance - sentMoney < 0n) {
					await interaction.reply(`この金額を送ることは出来ません。この金額を送った場合、あなたの銀行口座残高が0を下回ってしまいます。(${newmessagerbankbalance})`);
					return;
				}

				bankData[interaction.user.id].balance = (BigInt(bankData[interaction.user.id].balance) - sentMoney).toString();
				for (const key in bankData) {
					if (bankData[key].username == sentusername) {
						bankData[key].balance = (BigInt(bankData[key].balance) + sentMoney).toString();
						break;
					}
				}

				fs.writeFileSync("./ServerDatas/UserBankData.json", JSON.stringify(bankData, null, 4), "utf-8");
				await interaction.reply("送金が完了しました。");
				return;
			}

			if (interaction.commandName == "dice") {
				await interaction.reply(`サイコロを振った結果: **${Math.floor(Math.random() * 6) + 1}**`);
				return;
			}

			if (interaction.commandName == "roulette") {
				const num = Math.floor(Math.random() * 2);
				switch (num) {
					case 0:
						await interaction.reply("ルーレットの結果: **赤**");
						break;

					case 1:
						await interaction.reply("ルーレットの結果: **黒**");
						break;
				}
				return;
			}

			if (interaction.commandName == "kemo") {
				const dataBase = JSON.parse(fs.readFileSync("./Pictures/Furry/DataBase.json", "utf-8"));
				if (dataBase.FileCount == 0) {
					await interaction.reply("ファイルが存在しません。");
					return;
				}

				const random = Math.floor(Math.random() * dataBase.FileCount);
				const file = dataBase.PhotoDataBase[random];
				const picData = fs.readFileSync(path.join("./Pictures/Furry", file));
				await interaction.reply({ files: [{ attachment: picData, name: file }] });
				return;
			}

			if (interaction.commandName == "kemodelete") {
				const dataBase = JSON.parse(fs.readFileSync("./Pictures/Furry/DataBase.json", "utf-8"));
				const usercount = interaction.options.get('count').value;

				let foundFlag = false;
				for (const fileName of dataBase.PhotoDataBase) {
					const file = fileName.split(".")[0];
					if (file == usercount) {
						foundFlag = true;
						await fs.remove(`./Pictures/Furry/${fileName}`);
						dataBase.PhotoDataBase = dataBase.PhotoDataBase.filter(item => item !== fileName);
						dataBase.FileCount--;
						fs.writeFileSync("./Pictures/Furry/DataBase.json", JSON.stringify(dataBase, null, 4), "utf-8");
						await interaction.reply("ファイルが正常に削除されました。");
						break;
					}
				}

				if (!foundFlag) {
					await interaction.reply("そのファイルは存在しません。");
					return;
				}
				return;
			}

			if (interaction.commandName == "kemocount") {
				const dataBase = JSON.parse(fs.readFileSync("./Pictures/Furry/DataBase.json", "utf-8"));
				const count = dataBase.FileCount;
				await interaction.reply(`今まで追加した画像や映像、gifの合計枚数は${count}枚です。`);
				return;
			}

			if (interaction.commandName == "pic") {
				const tag = interaction.options.get('tag').value;
				if (!fs.existsSync(path.join("./Pictures/tag", tag, "DataBase.json"))) {
					await interaction.reply("このタグは存在しません。");
					return;
				}
				const dataBase = JSON.parse(fs.readFileSync(path.join("./Pictures/tag", tag, "DataBase.json"), "utf-8"));
				const filecount = dataBase.FileCount;
				if (filecount == 0) {
					await interaction.reply("ファイルが存在しません。");
					return;
				};
				const random = Math.floor(Math.random() * filecount);
				const file = dataBase.PhotoDataBase[random];
				const picData = fs.readFileSync(path.join("./Pictures/tag", tag, file));
				await interaction.reply({ files: [{ attachment: picData, name: file }] });
				return;
			}

			if (interaction.commandName == "settag") {
				const tagName = interaction.options.get('name').value;
				if (fs.existsSync(`./Pictures/tag/${tagName}`)) {
					await interaction.reply("このタグ名は登録できません。");
					return;
				}

				if (fs.existsSync(`./Pictures/tag/${tagName}/DataBase.json`)) {
					await interaction.reply("このタグは既に存在しています。");
					return;
				}
				
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					const dataBase = JSON.parse(fs.readFileSync(`./Pictures/tag/${folder}/DataBase.json`, "utf-8"));
					if (dataBase.id == interaction.channel.id) {
						fs.renameSync(`./Pictures/tag/${folder}`, `./Pictures/tag/${tagName}`);
						await interaction.reply("このチャンネルのタグ名を更新しました。");
						return;
					}
				}
				
				await fs.mkdir(`./Pictures/tag/${tagName}`);
				fs.writeFileSync(`./Pictures/tag/${tagName}/DataBase.json`, JSON.stringify({
					id: interaction.channel.id,
					FileCount: 0,
					PhotoDataBase: []
				}, null, 4), "utf-8");
				await interaction.reply("タグが正常に作成されました。");
				return;
			}

			if (interaction.commandName == "deltag") {
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					const dataBase = JSON.parse(fs.readFileSync(`./Pictures/tag/${folder}/DataBase.json`, "utf-8"));
					if (dataBase.id == interaction.channel.id) {
						await fs.remove(`./Pictures/tag/${folder}/DataBase.json`);
						await interaction.reply("タグの削除が正常に完了しました。");
						return;
					}
				}
				await interaction.reply("このチャンネルのタグは存在しません。");
				return;
			}

			if (interaction.commandName == "delpic") {
				const usercount = interaction.options.get('count').value;
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					const dataBase = JSON.parse(fs.readFileSync(`./Pictures/tag/${folder}/DataBase.json`, "utf-8"));
					if (dataBase.id == interaction.channel.id) {
						for (const fileName of dataBase.PhotoDataBase) {
							const file = fileName.split(".")[0];
							if (file == usercount) {
								await fs.remove(`./Pictures/tag/${folder}/${fileName}`);
								dataBase.PhotoDataBase = dataBase.PhotoDataBase.filter(item => item !== fileName);
								dataBase.FileCount--;
								fs.writeFileSync(`./Pictures/tag/${folder}/DataBase.json`, JSON.stringify(dataBase, null, 4), "utf-8");
								await interaction.reply("ファイルが正常に削除されました。");
								return;
							}
						}
						await interaction.reply("そのファイルは存在しません。");
						return;
					}
				}
				await interaction.reply("このチャンネルのタグは存在しません。");
				return;
			}

			if (interaction.commandName == "piccount") {
				const tagName = interaction.options.get('name').value;
				if (!fs.existsSync(`./Pictures/tag/${tagName}/DataBase.json`)) {
					await interaction.reply("このタグは登録されていません。");
					return;
				}
				const dataBase = JSON.parse(fs.readFileSync(`./Pictures/tag/${tagName}/DataBase.json`, "utf-8"));
				const filecount = dataBase.FileCount;
				await interaction.reply(`今まで${tagName}タグに追加した画像や映像、gifの合計枚数は${filecount}枚です。`);
				return;
			}

			if (interaction.commandName == "alltags") {
				let tagList = [];
				const allTags = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (let i = 0; i < allTags.length; i++) tagList.push(`${i + 1}: ${allTags[i]}\n`);
				await interaction.reply(`現在登録されているタグは以下の通りです。\n${tagList.join("")}`);
				return;
			}

			if (interaction.commandName == "quote") {
				const tag = interaction.options.get('name').value;
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				if (!allQuotes[tag]) {
					await interaction.reply("このタグは存在しません。");
					return;
				}
				if (allQuotes[tag].quotes.length == 0) {
					await interaction.reply("このタグには名言がないみたいです。");
					return;
				}
				const lineCount = allQuotes[tag].quotes.length;
				const randomLineNumber = Math.floor(Math.random() * lineCount);
				const randomLine = allQuotes[tag].quotes[randomLineNumber];
				await interaction.reply(`**${randomLine}** - ${tag}`);
				return;
			}

			if (interaction.commandName == "setquotetag") {
				const tagName = interaction.options.get('name').value;
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				if (allQuotes[tagName]) {
					await interaction.reply("このタグ名は既に存在しています。");
					return;
				}
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						allQuotes[tagName] = allQuotes[key];
						delete allQuotes[key];
						await interaction.reply("このチャンネルのタグ名を更新しました。");
						fs.writeFileSync("./ServerDatas/Quotes.json", JSON.stringify(allQuotes, null, 4), "utf-8");
						return;
					}
				}
				allQuotes[tagName] = {
					"id": interaction.channel.id,
					"quotes": []
				};
				fs.writeFileSync("./ServerDatas/Quotes.json", JSON.stringify(allQuotes, null, 4), "utf-8");
				await interaction.reply("タグが正常に作成されました。");
				return;
			}

			if (interaction.commandName == "delquotetag") {
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						delete allQuotes[key];
						fs.writeFileSync("./ServerDatas/Quotes.json", JSON.stringify(allQuotes, null, 4), "utf-8");
						await interaction.reply("タグが正常に削除されました。");
						return;
					}
				}
				await interaction.reply("このチャンネルにタグは存在しません。");
				return;
			}

			if (interaction.commandName == "delquote") {
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						const wannadelete = interaction.options.get('quote').value;
						if (!allQuotes[key].quotes.includes(wannadelete)) {
							await interaction.reply("その名言は存在しません。");
							return;
						}
						allQuotes[key].quotes = allQuotes[key].quotes.filter(item => item !== wannadelete );
						fs.writeFileSync("./ServerDatas/Quotes.json", JSON.stringify(allQuotes, null, 4), "utf-8");
						await interaction.reply("名言の削除が完了しました。");
						return;
					}
				}
				await interaction.reply("このチャンネルにはタグが存在しません。");
				return;
			}

			if (interaction.commandName == "quotecount") {
				const tagName = interaction.options.get('name').value;
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				if (!allQuotes[tagName]) {
					await interaction.reply("このタグは存在しません。");
					return;
				}
				if (allQuotes[tagName].quotes.length == 0) {
					await interaction.reply("このタグには名言がないみたいです。");
					return;
				}
				await interaction.reply(`今まで${interaction.channel.name}タグに追加した名言の合計枚数は${allQuotes[interaction.channel.name].quotes.length}個です。`);
				return;
			}

			if (interaction.commandName == "allquotetags") {
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				let taglist = [];
				let i = 0;
				for (const key in allQuotes) {
					taglist.push(`${i + 1}: ${key}\n`);
					i++;
				}
				if (taglist.length == 0) {
					await interaction.reply("まだ１つもタグが存在しません。");
					return;
				}
				await interaction.reply(`現在登録されているタグは以下の通りです。\n${taglist.join("")}`);
				return;
			}

			if (interaction.commandName == "link") {
				const channelid = interaction.channel.id;
				const allchannels = JSON.parse(fs.readFileSync("./ServerDatas/BeatmapLinkChannels.json", "utf-8"));
				if (allchannels.Channels.includes(channelid)) {
					await interaction.reply("このチャンネルでは既にマップ情報が表示されるようになっています。");
					return;
				}

				allchannels.Channels.push(channelid);
				fs.writeFileSync("./ServerDatas/BeatmapLinkChannels.json", JSON.stringify(allchannels, null, 4));
				await interaction.reply(`このチャンネルにマップリンクが送信されたら自動的にマップ情報が表示されるようになりました。解除したい場合は/unlinkコマンドを使用してください。`);
				return;
			}

			if (interaction.commandName == "unlink") {
				const channelid = interaction.channel.id;
				const allchannels = JSON.parse(fs.readFileSync("./ServerDatas/BeatmapLinkChannels.json", "utf-8"));
				if (!allchannels.Channels.includes(channelid)) {
					await interaction.reply("このチャンネルでは既にマップ情報が表示されないようになっています。");
					return;
				}

				allchannels.Channels = allchannels.Channels.filter(item => item !== channelid);
				fs.writeFileSync("./ServerDatas/BeatmapLinkChannels.json", JSON.stringify(allchannels, null, 4));
				await interaction.reply(`このチャンネルにマップリンクが送信されてもマップ情報が表示されないようになりました。再度表示したい場合は/linkコマンドを使用してください。`);
				return;
			}

			if (interaction.commandName == "check") {
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				const maplink = interaction.options.get("beatmaplink").value;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply("ビートマップリンクの形式が間違っています。");
					return;
				}

				await interaction.reply("計算中です...");
				new osuLibrary.CheckMapData(maplink).check()
					.then(async data => {
						const mapData = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
						const mapperData = await new osuLibrary.GetUserData(mapData.creator, apikey).getData();
						const mapperIconURL = osuLibrary.URLBuilder.iconURL(mapperData?.user_id);
						const mapperUserURL = osuLibrary.URLBuilder.userURL(mapperData?.user_id);
						const backgroundURL = osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id);
						const bpmMin = isNaNwithNumber(Math.min(...data.BPMarray));
						const bpmMax = isNaNwithNumber(Math.max(...data.BPMarray));
						const bpmStr = bpmMin == bpmMax ? bpmMax.toFixed(1) : `${bpmMin.toFixed(1)} ~ ${bpmMax.toFixed(1)}`;
						const hitTotal = data["1/3 times"] + data["1/4 times"] + data["1/6 times"] + data["1/8 times"];
						const streamTotal = data.streamCount + data.techStreamCount;
						const hitPercentData = [isNaNwithNumber(Math.round(data["1/3 times"] / hitTotal * 100)), isNaNwithNumber(Math.round(data["1/4 times"] / hitTotal * 100)), isNaNwithNumber(Math.round(data["1/6 times"] / hitTotal * 100)), isNaNwithNumber(Math.round(data["1/8 times"] / hitTotal * 100))] ;
						const streamPercentData = [isNaNwithNumber(Math.round(data.streamCount / streamTotal * 100)), isNaNwithNumber(Math.round(data.techStreamCount / streamTotal * 100))];
						const mapUrl = osuLibrary.URLBuilder.beatmapURL(mapData.beatmapset_id, Number(mapData.mode), mapData.beatmap_id);
						const embed = new EmbedBuilder()
							.setColor("Blue")
							.setTitle(`${mapData.artist} - ${mapData.title} [${mapData.version}]`)
							.setURL(mapUrl)
							.setAuthor({ name: `Mapped by ${mapData.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
							.addFields({ name: "**BPM**", value: `**${bpmStr}** (最頻値: **${data.BPMMode.toFixed(1)}**)`, inline: false })
							.addFields({ name: "**Streams**", value: `**1/4 Streams**: **${data.streamCount}**回 [最大**${data.maxStream}**コンボ / 平均**${Math.floor(data.over100ComboAverageStreamLength)}**コンボ] (${streamPercentData[0]}%)\n**Tech Streams**: **${data.techStreamCount}**回 [最大**${data.techStream}**コンボ / 平均**${Math.floor(data.over100ComboAverageTechStreamLength)}**コンボ] (${streamPercentData[1]}%)`, inline: false })
							.addFields({ name: "**Hit Objects**", value: `**1/3**: **${data["1/3 times"]}**回 [最大**${data["max1/3Length"]}**コンボ] (${hitPercentData[0]}%)\n**1/4**: **${data["1/4 times"]}**回 [最大**${data["max1/4Length"]}**コンボ] (${hitPercentData[1]}%)\n**1/6**: **${data["1/6 times"]}**回 [最大**${data["max1/6Length"]}**コンボ] (${hitPercentData[2]}%)\n**1/8**: **${data["1/8 times"]}**回 [最大**${data["max1/8Length"]}**コンボ] (${hitPercentData[3]}%)`, inline: false })
							.setImage(backgroundURL);
						await interaction.channel.send({ embeds: [embed] });
					});
				return;
			}

			if (interaction.commandName == "ispp") {
				const maplink = interaction.options.get("beatmaplink").value;
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}
				
				const Mods = new osuLibrary.Mod(interaction.options?.get("mods")?.value).get();
				if (!Mods) {
					await interaction.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。");
					return;
				}

				let mode;
				let data;
				if (regex.test(maplink)) {
					switch (maplink.split("/")[4].split("#")[1]) {
						case "osu":
							mode = 0;
							break;

						case "taiko":
							mode = 1;
							break;

						case "fruits":
							mode = 2;
							break;

						case "mania":
							mode = 3;
							break;
							
						default:
							await interaction.reply("リンク内のモードが不正です。");
							return;
					}
					data = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
				} else {
					data = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
					mode = Number(data.mode);
				}
				const ppdata = await new osuLibrary.CalculatePPSR(maplink, Mods.calc, mode).calculateSR();
				const Mapstatus = osuLibrary.Tools.mapstatus(data.approved);
				const FP = Math.round(Number(ppdata.pp) / Number(data.hit_length) * 1000) / 10;
				const ppdevidetotallength = Math.round(Number(ppdata.pp) / Number(data.hit_length) * 10) / 10;
				await interaction.reply(`Totalpp : **${ppdata.pp.toFixed(2)}** (**${Mapstatus}**)　Farmscore : **${isNaN(FP) ? 0 : FP}**　${isNaN(ppdevidetotallength) ? 0 : ppdevidetotallength} pp/s`);
				return;
			}

			if (interaction.commandName == "lb") {
				let maplink = interaction.options.get("beatmaplink").value;
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				const beatmapid = maplink.split("/")[maplink.split("/").length - 1];
				const modsText = interaction.options?.get("mods")?.value;
				const mods = new osuLibrary.Mod(modsText).get();
				if (!mods) {
					await interaction.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。");
					return;
				}
				
				let mode;
				let Mapinfo;
				if (regex.test(maplink)) {
					switch (maplink.split("/")[4].split("#")[1]) {
						case "osu":
							mode = 0;
							break;
	
						case "taiko":
							mode = 1;
							break;
	
						case "fruits":
							mode = 2;
							break;
	
						case "mania":
							mode = 3;
							break;
	
						default:
							await interaction.reply("リンク内のモードが不正です。");
							return;
					}
					Mapinfo = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
				} else {
					Mapinfo = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
					mode = Number(Mapinfo.mode);
					maplink = osuLibrary.URLBuilder.beatmapURL(Mapinfo.beatmapset_id, mode, Mapinfo.beatmap_id);
				}

				const mapperinfo = await new osuLibrary.GetUserData(Mapinfo.creator, apikey, mode).getData();

				const srData = new osuLibrary.CalculatePPSR(maplink, mods.calc, mode);
				const sr = await srData.calculateSR();
				let BPM = Number(Mapinfo.bpm);

				if (mods.array.includes("NC") || mods.array.includes("DT")) {
					BPM *= 1.5;
				} else if (mods.array.includes("HT")) {
					BPM *= 0.75;
				}

				await interaction.reply("ランキングの作成中です...");
				const resulttop5 = await axios.get(`https://osu.ppy.sh/api/get_scores?k=${apikey}&b=${beatmapid}&m=${mode}&mods=${mods.num}&limit=5`)
					.then(res => {
						return res.data;
					});

				if (resulttop5.length == 0) {
					await interaction.channel.send("このマップ、Modsにはランキングが存在しません。");
					return;
				}

				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mapperinfo?.user_id);
				const mapperUserURL = osuLibrary.URLBuilder.userURL(mapperinfo?.user_id);
				const backgroundURL = osuLibrary.URLBuilder.backgroundURL(Mapinfo.beatmapset_id);

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`Map leaderboard: ${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
					.setURL(maplink)
					.setAuthor({ name: `Mapped by ${Mapinfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.addFields({ name: "**MapInfo**", value: `\`Mods\`: **${mods.str}** \`SR\`: **${sr.sr.toFixed(2)}** \`BPM\`: **${BPM}**`, inline: true })
					.setImage(backgroundURL);
				const rankingdata = [];
				for (let i = 0; i < Math.min(resulttop5.length, 5); i++) {
					const acc = tools.accuracy({
						300: resulttop5[i].count300,
						100: resulttop5[i].count100,
						50: resulttop5[i].count50,
						0: resulttop5[i].countmiss,
						geki:  resulttop5[i].countgeki,
						katu: resulttop5[i].countkatu
					},  modeConvertAcc(mode));

					const score = {
						mode: mode,
						mods: mods.calc,
						n300: Number(resulttop5[i].count300),
						n100: Number(resulttop5[i].count100),
						n50: Number(resulttop5[i].count50),
						nMisses: Number(resulttop5[i].countmiss),
						nGeki: Number(resulttop5[i].countgeki),
						nKatu: Number(resulttop5[i].countkatu),
						combo: Number(resulttop5[i].maxcombo)
					};
					const pp = await srData.calculateScorePP(score);
					rankingdata.push({ name: `\`#${i + 1}\``, value: `**Rank**: ${rankconverter(resulttop5[i].rank)}　Player: **${resulttop5[i].username}**　Score: **${Number(resulttop5[i].score).toLocaleString()}** \n Combo: **${resulttop5[i].maxcombo}**　**Acc**: **${acc}**%　PP: **${pp.toFixed(2)}**pp　Miss:${resulttop5[i].countmiss}`, inline: false });
				}
				embed.addFields(rankingdata);
				await interaction.channel.send({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "qf" || interaction.commandName == "deqf" || interaction.commandName == "loved" || interaction.commandName == "deloved") {
				const mode = interaction.options.get('mode').value;
				const channelid = interaction.channel.id;
				const allchannels = JSON.parse(fs.readFileSync(`./ServerDatas/MapcheckChannels.json`, "utf-8"));
				switch (interaction.commandName) {
					case "qf": {
						if (allchannels["Qualified"][mode].includes(channelid)) {
							await interaction.reply("このチャンネルは既にQualified、Rankedチェックチャンネルとして登録されています。");
							return;
						}
						allchannels["Qualified"][mode].push(channelid);
						fs.writeFileSync(`./ServerDatas/MapcheckChannels.json`, JSON.stringify(allchannels, null, 4));
						await interaction.reply(`このチャンネルを${mode}のQualified、Rankedチェックチャンネルとして登録しました。`);
						return;
					}

					case "deqf": {
						if (allchannels["Qualified"][mode].includes(channelid)) {
							const newchannels = allchannels["Qualified"][mode].filter(item => item !== channelid);
							fs.writeFileSync(`./ServerDatas/MapcheckChannels.json`, JSON.stringify(newchannels, null, 4));
							await interaction.reply(`このチャンネルを${mode}のQualified、Rankedチェックチャンネルから削除しました。`);
						} else {
							await interaction.reply("このチャンネルはQualified、Rankedチェックチャンネルとして登録されていません。");
						}
						return;
					}

					case "loved": {
						if (allchannels["Loved"][mode].includes(channelid)) {
							await interaction.reply("このチャンネルは既にLovedチェックチャンネルとして登録されています。");
							return;
						}
						allchannels["Loved"][mode].push(channelid);
						fs.writeFileSync(`./ServerDatas/MapcheckChannels.json`, JSON.stringify(allchannels, null, 4));
						await interaction.reply(`このチャンネルを${mode}のLovedチェックチャンネルとして登録しました。`);
						return;
					}

					case "deloved": {
						if (allchannels["Loved"][mode].includes(channelid)) {
							const newchannels = allchannels["Loved"][mode].filter(item => item !== channelid);
							fs.writeFileSync(`./ServerDatas/MapcheckChannels.json`, JSON.stringify(newchannels, null, 4));
							await interaction.reply(`このチャンネルを${mode}のLovedチェックチャンネルから削除しました。`);
						} else {
							await interaction.reply("このチャンネルはLovedチェックチャンネルとして登録されていません。");
						}
						return;
					}
				}
			}

			if (interaction.commandName == "qfmention" || interaction.commandName == "lovedmention" || interaction.commandName == "rankedmention" || interaction.commandName == "deqfmention" || interaction.commandName == "derankedmention" || interaction.commandName == "delovedmention") {
				const mode = interaction.options.get('mode').value;
				const userid = interaction.user.id;
				const serverid = interaction.guild.id;
				const alluser = JSON.parse(fs.readFileSync(`./ServerDatas/MentionUser.json`, "utf-8"));
				switch (interaction.commandName) {
					case "qfmention": {
						if (alluser["Qualified"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にQualifiedチェックチャンネルのメンションを受け取るようになっています。");
							return;
						}
						if (!alluser["Qualified"][serverid]) alluser["Qualified"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Qualified"][serverid][mode].push(userid);
						fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(alluser, null, 4));
						await interaction.reply(`今度から${mode}でQualifiedが検出されたらメンションが飛ぶようになりました.`);
						return;
					}

					case "lovedmention": {
						if (alluser["Loved"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にLovedチェックチャンネルのメンションを受け取るようになっています。");
							return;
						}
						if (!alluser["Loved"][serverid]) alluser["Loved"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Loved"][serverid][mode].push(userid);
						fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(alluser, null, 4));
						await interaction.reply(`今度から${mode}でlovedが検出されたらメンションが飛ぶようになりました。`);
						return;
					}

					case "rankedmention": {
						if (alluser["Ranked"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にRankedチェックチャンネルのメンションを受け取るようになっています。");
							return;
						}
						if (!alluser["Ranked"][serverid]) alluser["Ranked"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Ranked"][serverid][mode].push(userid);
						fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(alluser, null, 4));
						await interaction.reply(`今度から${mode}でRankedが検出されたらメンションが飛ぶようになりました。`);
						return;
					}

					case "deqfmention": {
						if (alluser["Qualified"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Qualified"][serverid][mode].filter(item => item !== userid);
							fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(newuser, null, 4));
							await interaction.reply(`今度から${mode}でQualified検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にQualifiedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						return;
					}

					case "derankedmention": {
						if (alluser["Ranked"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Ranked"][serverid][mode].filter(item => item !== userid);
							fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(newuser, null, 4));
							await interaction.reply(`今度から${mode}でRanked検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にRankedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						return;
					}

					case "delovedmention": {
						if (alluser["Loved"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Loved"][serverid][mode].filter(item => item !== userid);
							fs.writeFileSync(`./ServerDatas/MentionUser.json`, JSON.stringify(newuser, null, 4));
							await interaction.reply(`今度から${mode}でLoved検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にLovedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						return;
					}
				}
			}

			if (interaction.commandName == "bg") {
				const maplink = interaction.options.get("beatmaplink").value;
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				if (!regex.test(maplink)) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}
				const BeatmapsetId = maplink.split("/")[4].split("#")[0];
				await interaction.reply(`https://assets.ppy.sh/beatmaps/${BeatmapsetId}/covers/raw.jpg`);
				return;
			}

			if (interaction.commandName == "ifmod") {
				let playername = interaction.options.get('username')?.value;
				if (playername == undefined) {
					const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
					const username = allUser["Bancho"][interaction.user.id]?.name;
					if (username == undefined) {
						await interaction.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						return;
					}
					playername = username;
				}

				const maplink = interaction.options.get("beatmaplink")?.value;
				let scoreSearchMode = interaction.options.get("score")?.value;
				scoreSearchMode = !scoreSearchMode ? 1 : Number(scoreSearchMode);

				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				const mods = new osuLibrary.Mod(interaction.options?.get("mods")?.value).get();

				if (!mods) {
					await interaction.reply("Modが存在しないか、指定できないModです。");
					return;
				}

				let mode;
				let mapInfo;
				let modeforranking;
				let mapUrl;
				if (!regex.test(maplink)) {
					switch (maplink.split("/")[4].split("#")[1]) {
						case "osu":
							mode = 0;
							modeforranking = "osu";
							break;
						case "taiko":
							mode = 1;
							modeforranking = "taiko";
							break;
	
						case "fruits":
							mode = 2;
							modeforranking = "fruits";
							break;
	
						case "mania":
							mode = 3;
							modeforranking = "mania";
							break;
	
						default:
							await interaction.reply("リンク内のモードが不正です。");
							return;
					}
					mapInfo = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
					mapUrl = maplink;
				} else {
					mapInfo = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
					mode = Number(mapInfo.mode);
					switch (mode) {
						case 0:
							modeforranking = "osu";
							break;
						case 1:
							modeforranking = "taiko";
							break;
						case 2:
							modeforranking = "fruits";
							break;
						case 3:
							modeforranking = "mania";
							break;
					}
					mapUrl = osuLibrary.URLBuilder.beatmapURL(mapInfo.beatmapset_id, mode, mapInfo.beatmap_id);
				}

				let playersScore = await new osuLibrary.GetUserScore(playername, apikey, mode).getScoreDataWithoutMods(mapInfo.beatmap_id);

				if (playersScore.length == 0) {
					await interaction.reply(`${playername}さんのスコアが見つかりませんでした。`);
					return;
				}

				if (scoreSearchMode == 1) {
					let maxPP = 0;
					let maxPPIndex = 0;
					for (let i = 0; i < playersScore.length; i++) {
						if (Number(playersScore[i].pp) > maxPP) {
							maxPP = Number(playersScore[i].pp);
							maxPPIndex = i;
						}
					}
					playersScore = playersScore[maxPPIndex];
				} else {
					playersScore = playersScore[0];
				}

				const playersInfo = await new osuLibrary.GetUserData(playername, apikey, mode).getData();
				const mappersInfo = await new osuLibrary.GetUserData(mapInfo.creator, apikey, mode).getData();

				const acc = tools.accuracy({
					300: playersScore.count300,
					100: playersScore.count100,
					50: playersScore.count50,
					0: playersScore.countmiss,
					geki : playersScore.countgeki,
					katu: playersScore.countkatu
				}, modeConvertAcc(mode));

				const modsBefore = new osuLibrary.Mod(playersScore.enabled_mods).get();

				let score = {
					mode: mode,
					mods: modsBefore.calc,
					n300: Number(playersScore.count300),
					n100: Number(playersScore.count100),
					n50: Number(playersScore.count50),
					nMisses: Number(playersScore.countmiss),
					nGeki: Number(playersScore.countgeki),
					nKatu: Number(playersScore.countkatu),
					combo: Number(playersScore.maxcombo)
				};

				const calculator = new osuLibrary.CalculatePPSR(maplink, modsBefore.calc, mode);
				const PPbefore = await calculator.calculateScorePP(score);
				const SSPPbefore = await calculator.calculateSR();
				score.mods = mods.calc;
				calculator.mods = mods.calc;
				const PPafter = await calculator.calculateScorePP(score);
				const SSPPafter = await calculator.calculateSR();

				await interaction.reply(`${playersInfo.username}さんのランキングを計算中です。`);

				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				let pp = [];
				let ppForBonusPP = [];
				for (const element of userplays) {
					ppForBonusPP.push(Number(element.pp));
					if (mapInfo.beatmap_id == element.beatmap_id && PPafter > Number(userplays[userplays.length - 1].pp)) {
						pp.push(Math.round(PPafter * 100) / 100);
						continue;
					}
					pp.push(Number(element.pp));
				}
				pp.sort((a, b) => b - a);
				ppForBonusPP.sort((a, b) => b - a);

				const playcount = Number(playersInfo.playcount);
				const globalPPOld = osuLibrary.CalculateGlobalPP.calculate(ppForBonusPP, playcount);
				const globalPPwithoutBonusPP = osuLibrary.CalculateGlobalPP.calculate(pp, playcount);
				const bonusPP = Number(playersInfo.pp_raw) - globalPPOld;
				const globalPP = globalPPwithoutBonusPP + bonusPP;

				let ranking = 0;
				const globalPPDiff = globalPP - Number(playersInfo.pp_raw);
				const globalPPDiffPrefix = globalPPDiff > 0 ? "+" : "";
				
				const playerUserURL = osuLibrary.URLBuilder.userURL(playersInfo?.user_id);
				const mapperUserURL = osuLibrary.URLBuilder.userURL(mappersInfo?.user_id);
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mappersInfo?.user_id);
				const backgroundURL = osuLibrary.URLBuilder.backgroundURL(maplink);
				let foundflagforranking = false;
				try {
					await auth.login(osuclientid, osuclientsecret);
					for (let page = 0; page <= 100; page++) {
						const object = { "cursor[page]": page + 1 };
						let rankingdata = await v2.ranking.details(modeforranking, "performance", object);
						if (globalPP > rankingdata.ranking[rankingdata.ranking.length - 1].pp && !foundflagforranking) {
							foundflagforranking = true;
							for (let position = 0; position < 50; position++) {
								if (globalPP > rankingdata.ranking[position].pp) {
									ranking = (page * 50) + position + 1;
									break;
								}
							}
						}
						if (globalPP > rankingdata.ranking[rankingdata.ranking.length - 1].pp) break;
					}
				} catch (e) {
					await interaction.channel.send("ランキングの取得中にエラーが発生しました。");
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`${mapInfo.artist} - ${mapInfo.title} [${mapInfo.version}]`)
						.setDescription(`Played by [${playersInfo.username}](${playerUserURL})`)
						.addFields({ name: `Mods: ${modsBefore.str} → ${mods.str} Acc: ${acc}% Miss: ${playersScore.countmiss}`, value: `**PP:** **${PPbefore.toFixed(2)}**/${SSPPbefore.pp.toFixed(2)}pp → **${PPafter.toFixed(2)}**/${SSPPafter.pp.toFixed(2)}pp`, inline: true })
						.addFields({ name: `Rank`, value: `**${Number(playersInfo.pp_raw).toLocaleString()}**pp → **${(Math.round(globalPP * 10) / 10).toLocaleString()}**pp ${globalPPDiffPrefix + (globalPPDiff).toFixed(1)}`, inline: false })
						.setURL(mapUrl)
						.setAuthor({ name: `Mapped by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
						.setImage(backgroundURL);
					await interaction.channel.send({ embeds: [embed] });
					return;
				}

				if (!foundflagforranking) {
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`${mapInfo.artist} - ${mapInfo.title} [${mapInfo.version}]`)
						.setDescription(`Played by [${playersInfo.username}](${playerUserURL})`)
						.addFields({ name: `Mods: ${modsBefore.str} → ${mods.str} Acc: ${acc}% Miss: ${playersScore.countmiss}`, value: `**PP:** **${PPbefore.toFixed(2)}**/${SSPPbefore.pp.toFixed(2)}pp → **${PPafter.toFixed(2)}**/${SSPPafter.pp.toFixed(2)}pp`, inline: true })
						.addFields({ name: `Rank`, value: `**${Number(playersInfo.pp_raw).toLocaleString()}**pp → **${(Math.round(globalPP * 10) / 10).toLocaleString()}**pp ${globalPPDiffPrefix + (globalPPDiff).toFixed(1)}`, inline: false })
						.setURL(mapUrl)
						.setAuthor({ name: `Mapped by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
						.setImage(backgroundURL);
					await interaction.channel.send({ embeds: [embed] });
					return;
				}

				const rankingDiff = Number(playersInfo.pp_rank) - ranking;
				const rankingDiffPrefix = rankingDiff > 0 ? "+" : "";

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapInfo.artist} - ${mapInfo.title} [${mapInfo.version}]`)
					.setDescription(`Played by [${playersInfo.username}](${playerUserURL})`)
					.addFields({ name: `Mods: ${modsBefore.str} → ${mods.str} Acc: ${acc}% Miss: ${playersScore.countmiss}`, value: `**PP:** **${PPbefore.toFixed(2)}**/${SSPPbefore.pp.toFixed(2)}pp → **${PPafter.toFixed(2)}**/${SSPPafter.pp.toFixed(2)}pp`, inline: true })
					.addFields({ name: `Rank`, value: `**${Number(playersInfo.pp_raw).toLocaleString()}**pp (#${Number(playersInfo.pp_rank).toLocaleString()}) → **${(Math.round(globalPP * 10) / 10).toLocaleString()}**pp ${globalPPDiffPrefix + (globalPPDiff).toFixed(1)} (#${ranking.toLocaleString()} ${rankingDiffPrefix + rankingDiff})`, inline: false })
					.setURL(mapUrl)
					.setAuthor({ name: `Mapped by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.setImage(backgroundURL);
				await interaction.channel.send({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "srchart") {
				const maplink = interaction.options.get("beatmaplink").value;
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				let mode;
				let mapdata;
				if (regex.test(maplink)) {
					switch (maplink.split("/")[4].split("#")[1]) {
						case "osu":
							mode = 0;
							break;
						
						case "taiko":
							mode = 1;
							break;
	
						case "fruits":
							mode = 2;
							break;
	
						case "mania":
							mode = 3;
							break;
	
						default:
							await interaction.reply("リンク内のモードが不正です。");
							return;
					}
					mapdata = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
				} else {
					mapdata = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
					mode = Number(mapdata.mode);
				}
				const beatmapId = mapdata.beatmap_id;

				await interaction.reply("SRの計算中です。")
				await osuLibrary.SRChart.calculate(beatmapId, mode).then(async (res) => {
					const sr = await new osuLibrary.CalculatePPSR(beatmapId, 0, mode).calculateSR();
					await interaction.channel.send(`**${mapdata.artist} - ${mapdata.title} [${mapdata.version}]**のSRチャートです。最高は${sr.sr.toFixed(2)}★です。`);
					await interaction.channel.send({ files: [{ attachment: res, name: 'SRchart.png' }] });
				}).catch(async (e) => {
					console.log(e);
					await interaction.channel.send("計算できませんでした。");
				});
				return;
			}

			if (interaction.commandName == "preview") {
				const maplink = interaction.options.get("beatmaplink").value;

				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await interaction.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				const mapInfo = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
				const mode = Number(mapInfo.mode);
				const beatmapid = mapInfo.beatmap_id;
				const previewlink = `https://osu-preview.jmir.xyz/preview#${beatmapid}`
				const calculator = new osuLibrary.CalculatePPSR(maplink, 0, mode);
				const sr = await calculator.calculateSR();
				const object = await calculator.calcObject();
				let objectCount = 0;
				switch (mode) {
					case 0:
						objectCount = object.nCircles + object.nSliders + object.nSpinners;
						break;

					case 1:
						objectCount = object.nCircles + object.nSpinners;
						break;
			
					case 2:
						objectCount = object.maxCombo;
						break;
			
					case 3:
						objectCount = object.nCircles + object.nSliders + object.nSpinners;
						break;
				}

				const mapperdata = await new osuLibrary.GetUserData(mapInfo.creator, apikey).getData();
				const mapperUserURL = osuLibrary.URLBuilder.userURL(mapperdata?.user_id);
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mapperdata?.user_id);
				const backgroundURL = osuLibrary.URLBuilder.backgroundURL(maplink);
				const mapUrl = osuLibrary.URLBuilder.beatmapURL(mapInfo.beatmapset_id, mode, mapInfo.beatmap_id);

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapInfo.artist} - ${mapInfo.title} [${mapInfo.version}]`)
					.setDescription(`Combo: \`${mapInfo.max_combo}x\` Stars: \`${sr.sr.toFixed(2)}★\` \n Length: \`${formatTime(Number(mapInfo.total_length))} (${formatTime(Number(mapInfo.hit_length))})\` BPM: \`${mapInfo.bpm}\` Objects: \`${objectCount}\` \n CS: \`${mapInfo.diff_size}\` AR: \`${mapInfo.diff_approach}\` OD: \`${mapInfo.diff_overall}\` HP: \`${mapInfo.diff_drain}\` Spinners: \`${mapInfo.count_spinner}\``)
					.setURL(mapUrl)
					.setAuthor({ name: `Mapped by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.addFields({ name: "Preview link", value: `[Preview this map!](${previewlink})`, inline: true })
					.setImage(backgroundURL);
				await interaction.reply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "calculatepp") {
				let mode = interaction.options.get('mode').value;
				const osufile = interaction.options.get('beatmapfile').attachment.attachment;

				if (!osufile.includes(".osu")) {
					await interaction.reply("ファイルの形式が間違っています。〇〇.osuファイルを送信してください。");
					return;
				}

				switch (mode) {
					case "osu":
						mode = 0;
						break;

					case "taiko":
						mode = 1;
						break;

					case "catch":
						mode = 2;
						break;

					case "mania":
						mode = 3;
						break;
				}

				let mod = new osuLibrary.Mod(interaction.options.get('mods')?.value).get();

				if (!mod) {
					await interaction.reply("Modが存在しないか、指定できないModです。");
					return;
				}

				const beatmapdata = await axios.get(osufile, { responseType: 'arraybuffer' })
					.then(res => res.data);

				await interaction.reply("計算中です。");
				const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmapdata)) });
				const beatmapDataStream = Readable.from(Buffer.from(beatmapdata));
				const lineReader = require('readline').createInterface({ input: beatmapDataStream });
				let Mapinfo = {
					Mode: 0,
					Artist: "",
					Title: "",
					Creator: "",
					Version: "",
					HPDrainRate: 0,
					CircleSize: 0,
					OverallDifficulty: 0,
					ApproachRate: 0,
					BPM: "0",
					TotalLength: 0
				};

				let timingpointflag = false;
				let hitobjectflag = false;
				let BPM = [];

				lineReader.on('line', (line) => {
					if (timingpointflag && line.split(",")[6] == "1") {
						BPM.push(Math.round(1 / Number(line.split(",")[1]) * 1000 * 60 * 10) / 10);
					}

					if (line.startsWith("[TimingPoints]")) {
						timingpointflag = true;
					}

					if (line.startsWith("[Colours]")) {
						timingpointflag = false;
					}

					if (line.startsWith("[HitObjects]")) {
						timingpointflag = false;
						hitobjectflag = true;
					}
					
					if (hitobjectflag && !isNaN(Number(line.split(",")[2]))) {
						const ms = Number(line.split(",")[2]);
						const totalSeconds = Math.floor(ms / 1000);
						Mapinfo.TotalLength = formatTime(totalSeconds);
					}

					if (line.startsWith("[")) return;
					const key = line.split(":")[0];
					const value = line.split(":")?.slice(1)?.join(":");

					if (key === 'Mode') Mapinfo.Mode = Number(value);
					if (key === 'Artist') Mapinfo.Artist = value;
					if (key === 'Title') Mapinfo.Title = value;
					if (key === 'Creator') Mapinfo.Creator = value;
					if (key === 'Version') Mapinfo.Version = value;
					if (key === 'HPDrainRate') Mapinfo.HPDrainRate = Number(value);
					if (key === 'CircleSize') Mapinfo.CircleSize = Number(value);
					if (key === 'OverallDifficulty') Mapinfo.OverallDifficulty = Number(value);
					if (key === 'ApproachRate') Mapinfo.ApproachRate = Number(value);
				});

				lineReader.on('close', async () => {
					if (Mapinfo.Mode != mode && Mapinfo.Mode != 0) mode = Mapinfo.Mode;
					let score = {
						mode: mode,
						mods: mod.calc
					};
					let calc = new Calculator(score);
					const Calculated = calc.performance(map);
					const PP98 = ppDigits(calc.acc(98).performance(map).pp.toFixed(2));
					const PP99 = ppDigits(calc.acc(99).performance(map).pp.toFixed(2));
					const PP995 = ppDigits(calc.acc(99.5).performance(map).pp.toFixed(2));
					const PP100 = ppDigits(calc.acc(100).performance(map).pp.toFixed(2));
					const maxcombo = Calculated.difficulty.maxCombo;
					function calcObject(mode) {
						switch (mode) {
							case 0: {
								const object = new Calculator(score).performance(map).difficulty;
								return object.nCircles + object.nSliders + object.nSpinners;
							}

							case 1: {
								const object = new Calculator(score).mapAttributes(map);
								return object.nCircles + object.nSpinners;
							}

							case 2: {
								const object = new Calculator(score).performance(map).difficulty;
								return object.maxCombo;
							}

							case 3: {
								const object = new Calculator(score).mapAttributes(map);
								return object.nCircles + object.nSliders + object.nSpinners;
							}
						}
					}
					Mapinfo.BPM = Math.max(...BPM) == Math.min(...BPM) ? Math.max(...BPM).toString() : `${Math.min(...BPM)} - ${Math.max(...BPM)}`;
					function ppDigits(ppstring) {
						switch (ppstring.length) {
							case 7:
								return  `  ${ppstring} `;
							case 6:
								return  `  ${ppstring}  `;
							case 5:
								return  `  ${ppstring}   `;
							case 4:
								return  `   ${ppstring}   `;
						}
					}

					if (mod.array.includes("NC") || mod.array.includes("DT")) {
						Mapinfo.BPM *= 1.5;
						Mapinfo.TotalLength /= 1.5;
					} else if (mod.array.includes("HT")) {
						Mapinfo.BPM *= 0.75;
						Mapinfo.TotalLength /= 0.75;
					}

					if (mod.array.includes("HR")) {
						Mapinfo.OverallDifficulty *= 1.4;
						Mapinfo.ApproachRate *= 1.4;
						Mapinfo.CircleSize *= 1.3;
						Mapinfo.HPDrainRate *= 1.4;
					} else if (mod.array.includes("EZ")) {
						Mapinfo.OverallDifficulty *= 0.5;
						Mapinfo.ApproachRate *= 0.5;
						Mapinfo.CircleSize *= 0.5;
						Mapinfo.HPDrainRate *= 0.5;
					}

					Mapinfo.OverallDifficulty = Math.max(0, Math.min(10, Mapinfo.OverallDifficulty));
					Mapinfo.ApproachRate = Math.max(0, Math.min(10, Mapinfo.ApproachRate));
					Mapinfo.CircleSize = Math.max(0, Math.min(10, Mapinfo.CircleSize));
					Mapinfo.HPDrainRate = Math.max(0, Math.min(10, Mapinfo.HPDrainRate));
					Mapinfo.OverallDifficulty = Math.round(Mapinfo.OverallDifficulty * 10) / 10;
					Mapinfo.ApproachRate = Math.round(Mapinfo.ApproachRate * 10) / 10;
					Mapinfo.CircleSize = Math.round(Mapinfo.CircleSize * 10) / 10;
					Mapinfo.HPDrainRate = Math.round(Mapinfo.HPDrainRate * 10) / 10;

					const objectCount = calcObject(mode);
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setAuthor({ name: `Mapped by ${Mapinfo.Creator}` })
						.setTitle(`${Mapinfo.Artist} - ${Mapinfo.Title}`)
						.setURL(osufile)
						.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${Mapinfo.Version}__**] **+ ${mod.str}**`, value: `Combo: \`${maxcombo}x\` Stars: \`${Calculated.difficulty.stars.toFixed(2)}★\` \n Length: \`${Mapinfo.TotalLength}\` BPM: \`${Mapinfo.BPM}\` Objects: \`${objectCount}\` \n CS: \`${Mapinfo.CircleSize}\` AR: \`${Mapinfo.ApproachRate}\` OD: \`${Mapinfo.OverallDifficulty}\`  HP: \`${Mapinfo.HPDrainRate}\` `, inline: false })
						.addFields({ name: `**__PP__**`, value: `\`\`\` Acc |    98%   |    99%   |   99.5%  |   100%   | \n ----+----------+----------+----------+----------+  \n  PP |${PP98}|${PP99}|${PP995}|${PP100}|\`\`\``, inline: true });
					await interaction.channel.send({ embeds: [embed] });
				});
				return;
			}

			if (interaction.commandName == "osubgquiz") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get('username').value;
				let mode = interaction.options.get('mode').value;

				switch (mode) {
					case "osu":
						mode = 0;
						break;
					case "taiko":
						mode = 1;
						break;
					case "catch":
						mode = 2;
						break;
					case "mania":
						mode = 3;
						break;
				}

				const quizdata = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${mode}&limit=100`)
					.then(res => {
						return res.data;
					});

				if (quizdata.length == 0) {
					await interaction.reply("記録が見つかりませんでした。");
					return;
				}

				if (quizdata.length < 10) {
					await interaction.reply("記録が10個以下であったためクイズの問題を取得できませんでした。");
					return;
				}

				await interaction.reply("クイズを開始します。問題は10問です。");

				const randomnumber = [];
				while (randomnumber.length < 10) {
					const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
					if (!randomnumber.includes(randomNumber)) randomnumber.push(randomNumber);
				}

				const randommap = [];
				const randommaptitle = [];
				for (const element of randomnumber) {
					let errorFlag = false;
					const beatmapsetid = await new osuLibrary.GetMapData(quizdata[element].beatmap_id, apikey, mode).getData()
						.catch(() => {
							errorFlag = true;
						});
					if (errorFlag) continue;
					randommap.push(beatmapsetid.beatmapset_id);
					randommaptitle.push(beatmapsetid.title);
				}
				
				let randomjson = [];
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "BG", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": false, "Answerer": "", "hint": false});
				}
				fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4));
				const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
				await interaction.channel.send(`問題1のBGを表示します。`);
				await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' })
					.then(async res => {
						const BGdata = res.data;
						await interaction.channel.send({ files: [{ attachment: BGdata, name: 'bg.jpg' }] });
					});
				return;
			}

			if (interaction.commandName == "osubgquizpf") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get('username').value;
				let mode = interaction.options.get('mode').value;

				switch (mode) {
					case "osu":
						mode = 0;
						break;
					case "taiko":
						mode = 1;
						break;
					case "catch":
						mode = 2;
						break;
					case "mania":
						mode = 3;
						break;
				}

				const quizdata = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${mode}&limit=100`)
					.then(res => {
						return res.data;
					});

				if (quizdata.length == 0) {
					await interaction.reply("記録が見つかりませんでした。");
					return;
				}

				if (quizdata.length < 10) {
					await interaction.reply("記録が10個以下であったためクイズの問題を取得できませんでした。");
					return;
				}

				await interaction.reply("クイズを開始します。問題は10問です。");

				const randomnumber = [];
				while (randomnumber.length < 10) {
					const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
					if (!randomnumber.includes(randomNumber)) randomnumber.push(randomNumber);
				}

				const randommap = [];
				const randommaptitle = [];
				for (const element of randomnumber) {
					let errorFlag = false;
					const beatmapsetid = await new osuLibrary.GetMapData(quizdata[element].beatmap_id, apikey, mode).getData()
						.catch(() => {
							errorFlag = true;
						});
					if (errorFlag) continue;
					randommap.push(beatmapsetid.beatmapset_id);
					randommaptitle.push(beatmapsetid.title);
				}
				
				let randomjson = [];
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "BG", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": true, "Answerer": "", "hint": false})
				}
				fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4));
				const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
				await interaction.channel.send(`問題1のBGを表示します。`);
				await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' })
					.then(async res => {
						const BGdata = res.data;
						await interaction.channel.send({ files: [{ attachment: BGdata, name: 'bg.jpg' }] });
					});
				return;
			}

			if (interaction.commandName == "osuquiz") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get('username').value;
				let mode = interaction.options.get('mode').value;

				switch (mode) {
					case "osu":
						mode = 0;
						break;
					case "taiko":
						mode = 1;
						break;
					case "catch":
						mode = 2;
						break;
					case "mania":
						mode = 3;
						break;
				}

				const quizdata = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${mode}&limit=100`)
					.then(res => {
						return res.data;
					});

				if (quizdata.length == 0) {
					await interaction.reply("記録が見つかりませんでした。");
					return;
				}

				if (quizdata.length < 10) {
					await interaction.reply("記録が10個以下であったためクイズの問題を取得できませんでした。");
					return;
				}

				await interaction.reply("クイズを開始します。問題は10問です。");

				const randomnumber = [];
				while (randomnumber.length < 10) {
					const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
					if (!randomnumber.includes(randomNumber)) randomnumber.push(randomNumber);
				}

				const randommap = [];
				const randommaptitle = [];
				for (const element of randomnumber) {
					let errorFlag = false;
					const beatmapsetid = await new osuLibrary.GetMapData(quizdata[element].beatmap_id, apikey, mode).getData()
						.catch(() => {
							errorFlag = true;
						});
					if (errorFlag) continue;
					randommap.push(beatmapsetid.beatmapset_id);
					randommaptitle.push(beatmapsetid.title);
				}
				
				let randomjson = [];
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "pre", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": false, "Answerer": "", "hint": false});
				}
				fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4));
				const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
				await interaction.channel.send(`問題1のプレビューを再生します。`);
				await axios.get(`https://b.ppy.sh/preview/${jsondata[0].id}.mp3`, { responseType: 'arraybuffer' })
					.then(async res => {
						const audioData = res.data;
						await interaction.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
					});
				return;
			}

			if (interaction.commandName == "osuquizpf") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get('username').value;
				let mode = interaction.options.get('mode').value;

				switch (mode) {
					case "osu":
						mode = 0;
						break;
					case "taiko":
						mode = 1;
						break;
					case "catch":
						mode = 2;
						break;
					case "mania":
						mode = 3;
						break;
				}

				const quizdata = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${mode}&limit=100`)
					.then(res => {
						return res.data;
					});
				

				if (quizdata.length == 0) {
					await interaction.reply("記録が見つかりませんでした。");
					return;
				}

				if (quizdata.length < 10) {
					await interaction.reply("記録が10個以下であったためクイズの問題を取得できませんでした。");
					return;
				}

				await interaction.reply("クイズを開始します。問題は10問です。");

				const randomnumber = [];
				while (randomnumber.length < 10) {
					const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
					if (!randomnumber.includes(randomNumber)) randomnumber.push(randomNumber);
				}

				const randommap = [];
				const randommaptitle = [];
				for (const element of randomnumber) {
					let errorFlag = false;
					const beatmapsetid = await new osuLibrary.GetMapData(quizdata[element].beatmap_id, apikey, mode).getData()
						.catch(() => {
							errorFlag = true;
						});
					if (errorFlag) continue;
					randommap.push(beatmapsetid.beatmapset_id);
					randommaptitle.push(beatmapsetid.title);
				}
				
				let randomjson = [];
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "pre", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": true, "Answerer": "", "hint": false});
				}
				fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4));
				const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
				await interaction.channel.send(`問題1のプレビューを再生します。`);
				await axios.get(`https://b.ppy.sh/preview/${jsondata[0].id}.mp3`, { responseType: 'arraybuffer' })
					.then(async res => {
						const audioData = res.data;
						await interaction.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
					});
				return;
			}

			if (interaction.commandName == "quizend") {
				if (!fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("クイズが開始されていません。");
					return;
				}
				const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
				let answererstring = "";
				for (let i = 0; i < answererarray.length; i++) {
					if (answererarray[i].Answerer == "") continue;
					if (answererarray[i].hint) {
						answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`;
					} else {
						answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
					}
				}
				await interaction.reply(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
				await fs.remove(`./OsuPreviewquiz/${interaction.channel.id}.json`);
				return;
			}

			if (interaction.commandName == "osusearch") {
				await interaction.reply("検索中です...");
				await auth.login(osuclientid, osuclientsecret);
				const seracheddata = await v2.beatmap.search({
					query: interaction.options.get('query').value,
					mode: interaction.options.get('mode').value
				});
				let data = [];
				if (seracheddata.beatmapsets.length == 0) {
					await interaction.channel.send("検索結果が見つかりませんでした。");
					return;
				}
				let embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`検索結果: ${interaction.options.get('query').value}`)
					.setImage(`https://assets.ppy.sh/beatmaps/${seracheddata.beatmapsets[0].beatmaps[0].beatmapset_id}/covers/cover.jpg`)
					.setTimestamp();
				
				for (let i = 0; i < Math.min(seracheddata.beatmapsets.length, 5); i++) {
					let array = seracheddata.beatmapsets[i].beatmaps;
					array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
					const maxRatingObj = array[array.length - 1];
					const minRatingObj = array[0];
					let maxsrobj = maxRatingObj.id;
					let minsrobj = minRatingObj.id;
					const maxsrdata = new osuLibrary.CalculatePPSR(maxsrobj, 0, modeConvertMap(interaction.options.get('mode')));
					const minsrdata = new osuLibrary.CalculatePPSR(minsrobj, 0, modeConvertMap(interaction.options.get('mode')));
					const nmmaxppData = await maxsrdata.calculateSR();
					const nmminppData = await minsrdata.calculateSR();
					const dtmaxppData = await maxsrdata.calculateDT();
					const dtminppData = await minsrdata.calculateDT();
					const srstring = nmmaxppData.sr == nmminppData.sr ? `SR: ☆**${nmmaxppData.sr.toFixed(2)}** (DT ☆**${dtmaxppData.sr.toFixed(2)}**)` : `SR: ☆**${nmminppData.sr.toFixed(2)} ~ ${nmmaxppData.sr.toFixed(2)}** (DT ☆**${dtminppData.sr.toFixed(2)} ~ ${dtmaxppData.sr.toFixed(2)}**)`;
					const ppstring = nmmaxppData.pp == nmminppData.pp ? `PP: **${nmmaxppData.pp.toFixed(2)}**pp (DT **${dtmaxppData.pp.toFixed(2)}**pp)` : `PP: **${nmminppData.pp.toFixed(2)} ~ ${nmmaxppData.pp.toFixed(2)}**pp (DT **${dtminppData.pp.toFixed(2)} ~ ${dtmaxppData.pp.toFixed(2)}**pp)`;
					data.push({ name: `${i + 1}. ${seracheddata.beatmapsets[i].title} - ${seracheddata.beatmapsets[i].artist}`, value: `▸Mapped by **${seracheddata.beatmapsets[i].creator}**\n▸${srstring}\n▸${ppstring}\n▸**Download**: [map](https://osu.ppy.sh/beatmapsets/${seracheddata.beatmapsets[i].id}) | [Nerinyan](https://api.nerinyan.moe/d/${seracheddata.beatmapsets[i].id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${seracheddata.beatmapsets[i].id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${seracheddata.beatmapsets[i].id})` })
				}
				embed.addFields(data);
				await interaction.channel.send({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "osureg") {
				const username = interaction.user.id;
				const osuid = interaction.options.get('username').value;
				const userData = await new osuLibrary.GetUserData(osuid, apikey).getDataWithoutMode();
				if (!userData) {
					await interaction.reply("ユーザーが見つかりませんでした。");
					return;
				}
				const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
				if (!allUser["Bancho"][username]) {
					allUser["Bancho"][username] = {
						"name": osuid
					};
				} else {
					allUser["Bancho"][username].name = osuid;
				}
				fs.writeFileSync("./ServerDatas/PlayerData.json", JSON.stringify(allUser, null, 4));
				await interaction.reply(`${interaction.user.displayName}さんは${osuid}として保存されました!`);
				return;
			}

			if (interaction.commandName == "slayer") {
				const username = interaction.options.get('username').value;
				const slayerid = interaction.options.get('slayername').value;
				const i = interaction.options.get('profileid').value;

				if (!/^[\d.]+$/g.test(i)) {
					await interaction.reply("プロファイル番号は数字のみで入力してください。");
					return;
				}

				const useruuidresponce = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`);

				const responce = await axios.get(
					`https://api.hypixel.net/skyblock/profiles?key=${hypixelapikey}&uuid=${useruuidresponce.data.id}`
				);

				if (!responce.data.success) {
					await interaction.reply("データを取得するのに失敗しました。");
					return;
				}
				
				if (responce.data.profiles == null) {
					await interaction.reply("このユーザーはSkyblockをしていないようです。");
					return;
				}

				let slayername;
				switch (slayerid) {
					case "Revenant Horror":
						slayername = "zombie";
						break;
					case "Tarantula Broodfather":
						slayername = "spider";
						break;
					case "Sven Packmaster":
						slayername = "wolf";
						break;
					case "Voidgloom Seraph":
						slayername = "enderman";
						break;
					case "Inferno Demonlord":
						slayername = "blaze";
						break;
					case "Riftstalker Bloodfiend":
						interaction.reply("このスレイヤーの処理機能はまだ実装されていません。");
						return;
					default:
						await interaction.reply("スレイヤーのIDが不正です。");
						return;
				}

				let showonlyslayername;
				switch (slayername) {
					case "zombie":
						showonlyslayername = "ゾンスレ";
						break;

					case "spider":
						showonlyslayername = "クモスレ";
						break;

					case "wolf":
						showonlyslayername = "ウルフスレ";
						break;

					case "enderman":
						showonlyslayername = "エンスレ";
						break;

					case "blaze":
						showonlyslayername = "ブレイズスレ";
						break;
				}

				if (responce.data.profiles[i] == undefined) {
					await interaction.reply("このプロファイルは存在しないようです。");
					return;
				}

				const userslayerxp = eval(`responce.data.profiles[${i}].members.${useruuidresponce.data.id}.slayer_bosses.${slayername}.xp`);

				if (userslayerxp == undefined) {
					await interaction.reply(`プロファイル:${responce.data.profiles[i].cute_name} | このプレイヤーは${showonlyslayername}をしていないみたいです。`);
					return;
				}

				let remainxp;
				switch (true) {
					case userslayerxp >= 1000000:
						await interaction.reply(`プロファイル:${responce.data.profiles[i].cute_name} | このプレイヤーの${showonlyslayername}レベルは既に**Lv9**です。`);
						break;
					case userslayerxp >= 400000:
						remainxp = 1000000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv8**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1000000 * 100).toFixed(1))}${(userslayerxp / 1000000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 100000:
						remainxp = 400000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv7**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 400000 * 100).toFixed(1))}${(userslayerxp / 400000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 20000:
						remainxp = 100000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv6**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 100000 * 100).toFixed(1))}${(userslayerxp / 100000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 5000:
						remainxp = 20000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv5**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 20000 * 100).toFixed(1))}${(userslayerxp / 20000 * 100).toFixed(1)}%`);
						break;
					case ((slayername == "zombie" || slayername == "spider") && userslayerxp >= 1000) || ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 1500):
						remainxp = 5000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv4**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 5000 * 100).toFixed(1))}${(userslayerxp / 5000 * 100).toFixed(1)}%`);
						break;
					case (slayername == "zombie" || slayername == "spider") && userslayerxp >= 200:
						remainxp = 1000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1000 * 100).toFixed(1))}${(userslayerxp / 1000 * 100).toFixed(1)}%`);
						break;
					case (slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 250:
						remainxp = 1500 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1500 * 100).toFixed(1))}${(userslayerxp / 1500 * 100).toFixed(1)}%`);
						break;
					case (slayername == "zombie" && userslayerxp >= 15) || (slayername == "spider" && userslayerxp >= 25):
						remainxp = 200 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 200 * 100).toFixed(1))}${(userslayerxp / 200 * 100).toFixed(1)}%`);
						break;
					case (slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 30:
						remainxp = 250 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 250 * 100).toFixed(1))}${(userslayerxp / 250 * 100).toFixed(1)}%`);
						break;
					default:
						remainxp = 5 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | このプレイヤーの${showonlyslayername}はLv1に達していません。次のレベルまでに必要なXPは${remainxp}です。`);
						break;
				}
				return;
			}

			if (interaction.commandName == "profile") {
				const username = interaction.options.get('username').value;

				const useruuidresponce = await axios.get(`https://api.mojang.com/users/profiles/minecraft/${username}`)
					.then(res => {
						return res.data;
					});

				const responce = await axios.get(`https://api.hypixel.net/skyblock/profiles?key=${hypixelapikey}&uuid=${useruuidresponce.id}`)
					.then(res => {
						return res.data;
					});

				if (!responce.success) {
					await interaction.reply("データを取得するのに失敗しました。");
					return;
				}
				
				if (responce.profiles == null) {
					await interaction.reply("このユーザーはSkyblockをしていないようです。");
					return;
				}

				let showprofilemessage = ["__**プロファイル一覧**__"];
				let showonlyselected;
				for (let i = 0; i < responce.profiles.length; i++) {
					if (responce.profiles[i].selected) {
						showonlyselected = "✅";
					} else {
						showonlyselected = "❌";
					}
					showprofilemessage.push(`**${i}**: ${responce.profiles[i].cute_name} | 選択中: ${showonlyselected}`);
				}
				await interaction.reply(showprofilemessage.join("\n"));
				return;
			}

			if (interaction.commandName == "skyblockpatch") {
				const data = await axios.get(`https://api.hypixel.net/skyblock/news?key=${hypixelapikey}`)
					.then(res => {
						return res.data.items[0];
					});
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`最新のパッチ: ${ data.title}`)
					.setURL(data.link)
					.setDescription(data.text)
					.setFooter({ text: "Hypixel Skyblock News" })
					.setTimestamp();
				await interaction.reply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "loc") {
				const username = interaction.options.get('username').value;
				const reponame = interaction.options.get('repository').value;
				await interaction.reply("LOCの計算中です...");
				const locdata = await axios.get(`https://api.codetabs.com/v1/loc?github=${username}/${reponame}`)
					.then(res => {
						return res.data;
					});
				for (const element of locdata) {
					if (element.language === 'Total') {
						const totalfilecount = element.files;
						const totalline = element.lines;
						const totalblanks = element.blanks;
						const comments = element.comments;
						const totalLOC = element.linesOfCode;
						await interaction.channel.send(`リポジトリ: **${username}/${reponame}**\nファイル数: **${totalfilecount}**\n総行数: **${totalline}**\n空白行数: **${totalblanks}**\nコメント行数: **${comments}**\n---------------\nコード行数: **${totalLOC}**`);
						break;
					}
				}
				return;
			}

			if (interaction.commandName == "backup") {
				if (interaction.user.id != BotadminId) {
					interaction.reply("このコマンドはBOT管理者のみ実行できます。");
					return;
				}

				const backuptime = interaction.options.get('backuptime').value;
				const directory = './Backups';
				const sortedFiles = getFilesSortedByDate(directory).reverse();
				const wannabackuptime = backuptime - 1;
				const wannabackup = sortedFiles[wannabackuptime];

				if (wannabackup == undefined) {
					interaction.reply("その期間のバックアップファイルは存在しません。");
					return;
				}

				const allbackupfilescount = fs.readdirSync(`./Backups/${wannabackup}`).length;
				const message = await interaction.reply(`${wannabackup}のバックアップの復元中です。(${allbackupfilescount}ファイル)\n${createProgressBar(0)}`);
				const percentstep = 100 / allbackupfilescount;
				let backupfilescount = 0;
				for (const backupfiles of fs.readdirSync(`./Backups/${wannabackup}`)) {
					await fs.copy(`./Backups/${wannabackup}/${backupfiles}`,`./${backupfiles}`);
					backupfilescount++;
					await message.edit(`バックアップの復元中です。(${backupfilescount}ファイル)\n${createProgressBar(Math.floor(percentstep * backupfilescount))}(${Math.floor(percentstep * backupfilescount)}%)`);
				}
				await message.edit(`バックアップの復元が完了しました。(${allbackupfilescount}ファイル)`);
				return;
			}

			if (interaction.commandName == "backuplist") {
				if (interaction.user.id != BotadminId) {
					await interaction.reply("このコマンドはBOT管理者のみ実行できます。");
					return;
				}
				
				const directory = './Backups';
				const sortedFiles = getFilesSortedByDate(directory).reverse();
				const backupfileslist = [];
				for (let i = 0; i < Math.min(10, sortedFiles.length); i++) {
					const inputString = sortedFiles[i];
					const [datePart, hour, minute] = inputString.split(' ');
					const [year, month, day] = datePart.split('-');
					const formattedMonth = month.length === 1 ? '0' + month : month;
					const formattedDay = day.length === 1 ? '0' + day : day;
					const formattedHour = hour.length === 1 ? '0' + hour : hour;
					const formattedMinute = minute.length === 1 ? '0' + minute : minute;
					const formattedString = `${year}年${formattedMonth}月${formattedDay}日 ${formattedHour}時${formattedMinute}分`;
					backupfileslist.push(`${i + 1} | ${formattedString}`);
				}

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`バックアップ一覧`)
					.setDescription(backupfileslist.join("\n"))
					.setFooter({ text: "バックアップ一覧" })
					.setTimestamp();
				await interaction.reply({ embeds: [embed], ephemeral: true });
				return;
			}

			if (interaction.commandName == "backupcreate") {
				if (interaction.user.id != BotadminId) {
					await interaction.reply("このコマンドはBOT管理者のみ実行できます。");
					return;
				}
				const message = await interaction.reply("バックアップの作成中です。");
				await makeBackup();
				await message.edit("バックアップの作成が完了しました。");
				return;
			}

			if (interaction.commandName == "echo") {
				const message = interaction.options.get('message').value;
				await interaction.reply({ content: '送信しますね！', ephemeral: true });
				await interaction.channel.send(message);
				return;
			}

			if (interaction.commandName == "talkcount") {
				const userid = interaction.user.id;
				let serverJSONdata = JSON.parse(fs.readFileSync(`./ServerDatas/talkcount.json`, "utf-8"));
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					return;
				}
				
				if (serverJSONdata[interaction.guildId][userid] == undefined) {
					await interaction.reply("あなたはまだこのサーバーで喋ったことがないようです。");
					return;
				}

				await interaction.reply(`あなたはこのサーバーで**${serverJSONdata[interaction.guildId][userid]}**回喋りました。`);
				return;
			}

			if (interaction.commandName == "talkranking") {
				let serverJSONdata = JSON.parse(fs.readFileSync(`./ServerDatas/talkcount.json`, "utf-8"));
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					return;
				}

				let talkranking = [];
				for (const [key, value] of Object.entries(serverJSONdata[interaction.guildId])) {
					talkranking.push([key, value]);
				}
				talkranking.sort(function(a, b) {
					return b[1] - a[1];
				});
				let talkrankingmessage = ["__**話した回数ランキング**__"];
				for (let i = 0; i < Math.min(talkranking.length, 10); i++) {
					const username = await client.users.fetch(talkranking[i][0]);
					talkrankingmessage.push(`**${i + 1}位**: ${username.globalName} | ${talkranking[i][1]}回`);
				}
				await interaction.reply(talkrankingmessage.join("\n"));
				return;
			}

			if (interaction.commandName == "talklevel") {
				const userid = interaction.user.id;
				let serverJSONdata = JSON.parse(fs.readFileSync(`./ServerDatas/talkcount.json`, "utf-8"));
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					return;
				}
				
				if (serverJSONdata[interaction.guildId][userid] == undefined) {
					await interaction.reply("あなたはまだこのサーバーで喋ったことがないようです。");
					return;
				}

				const talkcount = serverJSONdata[interaction.guildId][userid];
				let level = 0;
				let count;
				let nextlevelcount = 0;
				if (talkcount < 1 + Math.floor(Math.pow(1, 1.01))) {
					nextlevelcount = 1 + Math.floor(Math.pow(1, 1.01));
				} else {
					for (count = 1; count <= talkcount + 1; count += Math.floor(Math.pow(count, 1.01))) {
						if (count <= talkcount) {
							level++;
							nextlevelcount = count + Math.floor(Math.pow(count, 1.01));
						}
					}
				}
				await interaction.reply(`あなたのこのサーバーでのレベルは**Lv${level}**です。\n**${(talkcount / nextlevelcount * 100).toFixed(2)}**%${createProgressBar(talkcount / nextlevelcount * 100)}(次のレベル: **${talkcount} / ${nextlevelcount}**)`);
				return;
			}

			if (interaction.commandName == "talklevelranking") {
				let serverJSONdata = JSON.parse(fs.readFileSync(`./ServerDatas/talkcount.json`, "utf-8"));
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					return;
				}
				let talkranking = [];
				for (const [key, value] of Object.entries(serverJSONdata[interaction.guildId])) {
					talkranking.push([key, value]);
				}
				talkranking.sort(function(a, b) {
					return b[1] - a[1];
				});
				let talkrankingmessage = ["__**トークレベルランキング**__"];
				for (let i = 0; i < Math.min(talkranking.length, 10); i++) {
					const username = await client.users.fetch(talkranking[i][0]);
					const talkcount = talkranking[i][1];
					let level = 0;
					let count;
					let nextlevelcount = 0;
					if (talkcount < 1 + Math.floor(Math.pow(1, 1.01))) {
						nextlevelcount = 1 + Math.floor(Math.pow(1, 1.01));
					} else {
						for (count = 1; count <= talkcount + 1; count += Math.floor(Math.pow(count, 1.01))) {
							if (count <= talkcount) {
								level++;
								nextlevelcount = count + Math.floor(Math.pow(count, 1.01));
							}
						}
					}
					talkrankingmessage.push(`**${i + 1}位**: ${username.globalName} | Lv. **${level}** | 次のレベル: **${talkcount} / ${nextlevelcount}** (**${(talkcount / nextlevelcount * 100).toFixed(2)}**%)`);
				}
				await interaction.reply(talkrankingmessage.join("\n"));
				return;
			}
		} catch (e) {
			if (e.message == "No data found") {
				await interaction.channel.send("マップが見つかりませんでした。")
					.catch(async () => {
						await client.users.cache.get(interaction.user.id).send('こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！')
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			} else {
				asciify("Error", { font: "larry3d" }, (err, msg) => {
					if(err) return;
					console.log(msg);
				});
				console.log(e);
				await interaction.channel.send(`${interaction.user.username}さんのコマンドの実行中にエラーが発生しました。`)
					.catch(async () => {
						await client.users.cache.get(interaction.user.id).send('こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！')
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			}
		}
	}
);

client.on(Events.MessageCreate, async (message) =>
	{
		try {
			try {
				if (message.author.bot) return;
				let serverJSONdata = JSON.parse(fs.readFileSync("./ServerDatas/talkcount.json", "utf-8"));
				if (serverJSONdata[message.guildId] == undefined) {
					serverJSONdata[message.guildId] = {};
				}
				if (serverJSONdata[message.guildId][message.author.id] == undefined) {
					serverJSONdata[message.guildId][message.author.id] = 1;
				} else if (!message.content.startsWith("!")) {
					serverJSONdata[message.guildId][message.author.id] += 1;
				}
				fs.writeFileSync("./ServerDatas/talkcount.json", JSON.stringify(serverJSONdata, null, 4));
			} catch (e) {
				console.log(e);
			}

			if (message.content.split(" ")[0] == "!map") {
				if (message.content == "!map") {
					await message.reply("使い方: !map [マップリンク] (Mods) (Acc)");
					return;
				}

				const maplink = message.content.split(" ")[1];
				
				if (maplink == undefined) {
					await message.reply("マップリンクを入力してください。");
					return;
				}

				if (maplink == "") {
					await message.reply("マップリンクの前の空白が1つ多い可能性があります。");
					return;
				}

				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;

				if (!(regex.test(maplink) || regex2.test(maplink) || regex3.test(maplink))) {
					await message.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				let mode;
				let mapInfo;
				let mapUrl;
				if (regex.test(maplink)) {
					switch (maplink.split("/")[4].split("#")[1]) {
						case "osu":
							mode = 0;
							break;

						case "taiko":
							mode = 1;
							break;

						case "fruits":
							mode = 2;
							break;

						case "mania":
							mode = 3;
							break;
							
						default:
							await message.reply("リンク内のモードが不正です。");
							return;
					}
					mapInfo = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
					mapUrl = maplink;
				} else {
					mapInfo = await new osuLibrary.GetMapData(maplink, apikey, mode).getDataWithoutMode();
					mode = Number(mapInfo.mode);
					mapUrl = osuLibrary.URLBuilder.beatmapURL(mapInfo.beatmapset_id, mode, mapInfo.beatmap_id);
				}

				let arg2;
				let arg3;
				if (message.content.split(" ")[2] == undefined) {
					arg2 = "nothing";
				} else if (/^[a-zA-Z]+$/.test(message.content.split(" ")[2])) {
					arg2 = "mod";
				} else if (/^[\d.]+$/g.test(message.content.split(" ")[2]) || !isNaN(Number(message.content.split(" ")[2]))) {
					arg2 = "acc";
				} else if (message.content.split(" ")[2] == "") {
					await message.reply("Mods, Acc欄の前に空白が一つ多い可能性があります。");
					return;
				} else {
					await message.reply("Mods, Acc欄には数字かModのみを入力してください。");
					return;
				}

				if (message.content.split(" ")[3] == undefined) {
					arg3 = "nothing";
				} else if (/^[\d.]+$/g.test(message.content.split(" ")[3]) || !isNaN(Number(message.content.split(" ")[3]))) {
					arg3 = "acc";
				} else if (message.content.split(" ")[3] == "") {
					await message.reply("Acc欄の前に空白が一つ多い可能性があります。");
					return;
				} else {
					await message.reply("Acc欄には数字のみを入力してください。");
					return;
				}

				let Mods;
				if (arg2 == "nothing") {
					Mods = new osuLibrary.Mod().get();
				} else if (arg2 == "mod") {
					Mods = new osuLibrary.Mod(message.content.split(" ")[2]).get();
					if (!Mods) {
						await message.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。");
						return;
					}
				}

				let totalLength = Number(mapInfo.total_length);
				let totalHitLength = Number(mapInfo.hit_length);
				let BPM = Number(mapInfo.bpm);
				if (Mods.array.includes("DT") || Mods.array.includes("NC")) {
					BPM *= 1.5;
					totalLength /= 1.5;
					totalHitLength /= 1.5;
				} else if (Mods.array.includes("HT")) {
					BPM *= 0.75;
					totalLength /= 0.75;
					totalHitLength /= 0.75;
				}

				let Ar = Number(mapInfo.diff_approach);
				let Cs = Number(mapInfo.diff_size);
				let Od = Number(mapInfo.diff_overall);
				let Hp = Number(mapInfo.diff_drain);
				if (Mods.array.includes("HR")) {
					Ar *= 1.4;
					Cs *= 1.3;
					Od *= 1.4;
					Hp *= 1.4;
				} else if (Mods.array.includes("EZ")) {
					Ar *= 0.5;
					Cs *= 0.5;
					Od *= 0.5;
					Hp *= 0.5;
				}

				Od = Math.max(0, Math.min(10, Od));
				Cs = Math.max(0, Math.min(7, Cs));
				Hp = Math.max(0, Math.min(10, Hp));
				Ar = Math.max(0, Math.min(10, Ar));
				Od = Math.round(Od * 10) / 10;
				Cs = Math.round(Cs * 10) / 10;
				Hp = Math.round(Hp * 10) / 10;
				Ar = Math.round(Ar * 10) / 10;

				const mappersData = await new osuLibrary.GetUserData(mapInfo.creator, apikey, mode).getData();
				const calculator = new osuLibrary.CalculatePPSR(mapInfo.beatmap_id, Mods.calc, mode);
				const objectData = await calculator.calcObject();
				let objectCount;
				switch (mode) {
					case 0:
						objectCount = objectData.nCircles + objectData.nSliders + objectData.nSpinners;
						break;

					case 1:
						objectCount = objectData.nCircles + objectData.nSpinners;
						break;

					case 2:
						objectCount = objectData.maxCombo;
						break;

					case 3:
						objectCount = objectData.nCircles + objectData.nSliders + objectData.nSpinners;
						break;
				}

				let sr = {};
				for (const acc of [98, 99, 99.5, 100]) {
					calculator.acc = acc;
					sr[acc] = await calculator.calculateSR();
				}

				function formatPPStr(value) {
					switch (value.length) {
						case 3:
							return `   ${value}    `;

						case 4:
							return `   ${value}   `;

						case 5:
							return `   ${value}  `;

						case 6:
							return `  ${value}  `;

						case 7:
							return `  ${value} `;
						
						case 8:
							return ` ${value} `;

						case 9:
							return ` ${value}`;

						default:
							return `${value}`;
					}
				}

				const mapperUserURL = osuLibrary.URLBuilder.userURL(mappersData?.user_id);
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mappersData?.user_id);
				const backgroundURL = osuLibrary.URLBuilder.backgroundURL(mapInfo.beatmapset_id);

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapInfo.artist} - ${mapInfo.title}`)
					.setURL(mapUrl)
					.addFields({ name: "Music and Backgroud", value: `:musical_note:[Song Preview](https://b.ppy.sh/preview/${mapInfo.beatmapset_id}.mp3)　:frame_photo:[Full background](https://assets.ppy.sh/beatmaps/${mapInfo.beatmapset_id}/covers/raw.jpg)` })
					.setAuthor({ name: `Created by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapInfo.version}__**] **+${Mods.str}**`, value: `Combo: \`${mapInfo.max_combo}x\` Stars: \`${sr[100].sr.toFixed(2)}★\` \n Length: \`${formatTime(Number(totalLength))} (${formatTime(Number(totalHitLength))})\` BPM: \`${BPM}\` Objects: \`${objectCount}\` \n CS: \`${Cs}\` AR: \`${Ar}\` OD: \`${Od}\` HP: \`${Hp}\` Spinners: \`${mapInfo.count_spinner}\``, inline: true })
					.addFields({ name: "**Download**", value: `[Official](https://osu.ppy.sh/beatmapsets/${mapInfo.beatmapset_id}/download)\n[Nerinyan(no video)](https://api.nerinyan.moe/d/${mapInfo.beatmapset_id}?nv=1)\n[Beatconnect](https://beatconnect.io/b/${mapInfo.beatmapset_id})\n[chimu.moe](https://api.chimu.moe/v1/download/${mapInfo.beatmapset_id}?n=1)`, inline: true })
					.addFields({ name: `:heart: ${Number(mapInfo.favourite_count).toLocaleString()}　:play_pause: ${Number(mapInfo.playcount).toLocaleString()}`, value: `\`\`\` Acc |    98%   |    99%   |   99.5%  |   100%   | \n ----+----------+----------+----------+----------+  \n  PP |${formatPPStr(sr[98].pp.toFixed(2))}|${formatPPStr(sr[99].pp.toFixed(2))}|${formatPPStr(sr[99.5].pp.toFixed(2))}|${formatPPStr(sr[100].pp.toFixed(2))}|\`\`\``, inline: false })
					.setImage(backgroundURL)
					.setFooter({ text: `${osuLibrary.Tools.mapstatus(mapInfo.approved)} mapset of ${mapInfo.creator}` });
				await message.channel.send({ embeds: [embed] });

				if (arg2 == "acc") {
					calculator.acc = Number(message.content.split(" ")[2]);
					const accpp = await calculator.calculateSR();
					await message.reply(`**${Mods.str}**で**${message.content.split(" ")[2]}%**を取った時のPPは__**${accpp.pp.toFixed(2)}pp**__です。`);
				} else if (arg3 == "acc") {
					calculator.acc = Number(message.content.split(" ")[3]);
					const accpp = await calculator.calculateSR();
					await message.reply(`**${Mods.str}**で**${message.content.split(" ")[3]}%**を取った時のPPは__**${accpp.pp.toFixed(2)}pp**__です。`);
				}
				return;
			}

			if (message.content.split(" ")[0].startsWith("!r")) {
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						return;
					}
					playername = username;
				} else {
					playername = message.content.split(" ")?.slice(1)?.join(" ");
				}

				if (playername == "") {
					await message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
					return;
				}

				let currentMode;
				switch (message.content.split(" ")[0]) {
					case "!r":
					case "!ro":
						currentMode = 0;
						break;

					case "!rt":
						currentMode = 1;
						break;

					case "!rc":
						currentMode = 2;
						break;

					case "!rm":
						currentMode = 3;
						break;

					default:
						await message.reply("使い方: !r[o, t, c, m] (osu!ユーザーネーム)");
						return;
				}

				function calcPassedObject (score, mode) {
					let passedObjects = 0;
					switch (mode) {
						case 0:
							passedObjects = Number(score.count300) + Number(score.count100) + Number(score.count50) + Number(score.countmiss);
							break;

						case 1:
							passedObjects = Number(score.count300) + Number(score.count100) + Number(score.countmiss);
							break;

						case 2:
							passedObjects = Number(score.count300) + Number(score.count100) + Number(score.countmiss);
							break;

						case 3:
							passedObjects = Number(score.countgeki) + Number(score.count300) + Number(score.countkatu) + Number(score.count100) + Number(score.count50) + Number(score.countmiss);
							break;
							
						default:
							passedObjects = Number(score.count300) + Number(score.count100) + Number(score.count50) + Number(score.countmiss);
							break;
					}
					return passedObjects;
				}

				const userRecentData = await new osuLibrary.GetUserRecent(playername, apikey, currentMode).getData();
				if (userRecentData == undefined) {
					await message.reply(`${playername}さんには24時間以内にプレイした譜面がないようです。`);
					return;
				}

				const mapData = await new osuLibrary.GetMapData(userRecentData.beatmap_id, apikey, currentMode).getData()
				const playersdata = await new osuLibrary.GetUserData(playername, apikey, currentMode).getData();
				const mappersdata = await new osuLibrary.GetUserData(mapData.creator, apikey, currentMode).getData();
				const mods = new osuLibrary.Mod(userRecentData.enabled_mods).get();
				const recentAcc = tools.accuracy({
					300: userRecentData.count300,
					100: userRecentData.count100,
					50: userRecentData.count50,
					0: userRecentData.countmiss,
					geki: userRecentData.countgeki,
					katu: userRecentData.countkatu
				}, modeConvertAcc(currentMode));
				const recentPpData = new osuLibrary.CalculatePPSR(userRecentData.beatmap_id,  mods.calc, currentMode);
				await recentPpData.getMapData();
				const passedObjects = calcPassedObject(userRecentData, currentMode);
				const recentScore = {
					mode: currentMode,
					mods: mods.calc,
					n300: Number(userRecentData.count300),
					n100: Number(userRecentData.count100),
					n50: Number(userRecentData.count50),
					nMisses: Number(userRecentData.countmiss),
					nGeki: Number(userRecentData.countgeki),
					nKatu: Number(userRecentData.countkatu),
					combo: Number(userRecentData.maxcombo),
					passedObjects: passedObjects
				};
				const ssPp = await recentPpData.calculateSR();
				let recentPp = await recentPpData.calculateScorePP(recentScore);
				recentPp = Math.round(recentPp * 100) / 100;
				const beatmap = await recentPpData.getMap();
				const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmap)) });
				const objectData = await recentPpData.calcObject()
				let objectCount = 0;
				switch (currentMode) {
					case 0:
						objectCount = objectData.nCircles + objectData.nSliders + objectData.nSpinners;
						break;

					case 1:
						objectCount = objectData.nCircles + objectData.nSpinners;
						break;

					case 2:
						objectCount = objectData.maxCombo;
						break;

					case 3:
						objectCount = objectData.nCircles + objectData.nSliders + objectData.nSpinners;
						break;
				}
				
				const { ifFCPP, ifFCHits, ifFCAcc } = calcIfFCPP(recentScore, currentMode, objectData, passedObjects, mods.calc, Number(mapData.max_combo), map);
				let totalLength = Number(mapData.total_length);
				let hitLength = Number(mapData.hit_length);
				let BPM = Number(mapData.bpm);
				if (mods.array.includes("DT") || mods.array.includes("NC")) {
					BPM *= 1.5;
					totalLength /= 1.5;
					hitLength /= 1.5;
				} else if (mods.array.includes("HT")) {
					BPM *= 0.75;
					totalLength /= 0.75;
					hitLength /= 0.75;
				}

				let Ar = Number(mapData.diff_approach);
				let Od = Number(mapData.diff_overall);
				let Cs = Number(mapData.diff_size);
				let Hp = Number(mapData.diff_drain);

				if (mods.array.includes("HR")) {
					Od *= 1.4;
					Cs *= 1.3;
					Hp *= 1.4;
					Ar *= 1.4;
				} else if (mods.array.includes("EZ")) {
					Od *= 0.5;
					Cs *= 0.5;
					Hp *= 0.5;
					Ar *= 0.5;
				}
				Od = Math.max(0, Math.min(10, Od));
				Cs = Math.max(0, Math.min(7, Cs));
				Hp = Math.max(0, Math.min(10, Hp));
				Ar = Math.max(0, Math.min(10, Ar));
				Od = Math.round(Od * 10) / 10;
				Cs = Math.round(Cs * 10) / 10;
				Hp = Math.round(Hp * 10) / 10;
				Ar = Math.round(Ar * 10) / 10;
				const formattedLength = formatTime(totalLength);
				const formattedHitLength = formatTime(hitLength);
				const formattedHits = formatHits(recentScore, currentMode);
				const formattedIfFCHits = formatHits(ifFCHits, currentMode);

				const mapRankingData = await axios.get(`https://osu.ppy.sh/api/get_scores?k=${apikey}&b=${mapData.beatmap_id}&m=${currentMode}&limit=50`).then((responce) => {
					return responce.data;
				});

				let mapScores = [];
				for (const element of mapRankingData) {
					mapScores.push(Number(element.score));
				}
				let mapRanking = mapScores.length + 1;

				if (Number(userRecentData.score) >= mapScores[mapScores.length - 1]) {
					mapScores.sort((a, b) => a - b);
					const score = Number(userRecentData.score);
					for (const element of mapScores) {
						if (score >= element) {
							mapRanking--;
						} else {
							break;
						}
					}
				}

				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${currentMode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				let BPranking = 1;
				let foundFlag = false;
				for (const element of userplays) {
					if (element.beatmap_id == userRecentData.beatmap_id && element.score == userRecentData.score) {
						foundFlag = true;
						break;
					}
					BPranking++;
				}

				if (!foundFlag) {
					userplays.reverse();
					BPranking = userplays.length + 1;
					for (const element of userplays) {
						if (recentPp > Number(element.pp)) {
							BPranking--;
						} else {
							break;
						}
					}
				}

				let rankingString = "";
				const mapStatus = osuLibrary.Tools.mapstatus(mapData.approved);
				if (mapRanking <= 50 && BPranking <= 50 && userRecentData.rank != "F" && (mapStatus == "Ranked" || mapStatus == "Qualified" || mapStatus == "Loved" || mapStatus == "Approved")) {
					if (mapStatus == "Ranked" || mapStatus == "Approved") {
						rankingString = `**__Personal Best #${BPranking} and Global Top #${mapRanking}__**`;
					} else {
						rankingString = `**__Personal Best #${BPranking} (No Rank) and Global Top #${mapRanking}__**`;
					}
				} else if (mapRanking == 51 && BPranking <= 50 && userRecentData.rank != "F") {
					if (mapStatus == "Ranked" || mapStatus == "Approved") {
						rankingString = `**__Personal Best #${BPranking}__**`;
					} else {
						rankingString = `**__Personal Best #${BPranking} (No Rank)__**`;
					}
				} else if (mapRanking <= 50 && BPranking > 50 && userRecentData.rank != "F" && (mapStatus == "Ranked" || mapStatus == "Qualified" || mapStatus == "Loved" || mapStatus == "Approved")) {
					rankingString = `**__Global Top #${mapRanking}__**`;
				} else {
					rankingString = "`Result`";
				}

				const maplink = osuLibrary.URLBuilder.beatmapURL(mapData.beatmapset_id, currentMode, mapData.beatmap_id);
				const playerIconUrl = osuLibrary.URLBuilder.iconURL(playersdata?.user_id);
				const playerUrl = osuLibrary.URLBuilder.userURL(playersdata?.user_id);
				const mapperIconUrl = osuLibrary.URLBuilder.iconURL(mappersdata?.user_id);
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapData.artist} - ${mapData.title} [${mapData.version}]`)
					.setURL(maplink)
					.setAuthor({ name: `${playersdata.username}: ${Number(playersdata.pp_raw).toLocaleString()}pp (#${Number(playersdata.pp_rank).toLocaleString()} ${playersdata.country}${Number(playersdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconUrl, url: playerUrl })
					.addFields({ name: "`Grade`", value: `${rankconverter(userRecentData.rank)} + ${mods.str}`, inline: true })
					.addFields({ name: "`Score`", value: `${Number(userRecentData.score).toLocaleString()}`, inline: true })
					.addFields({ name: "`Acc`", value: `${recentAcc}%`, inline: true })
					.addFields({ name: "`PP`", value: `**${recentPp}** / ${ssPp.pp.toFixed(2)}PP`, inline: true })
					.addFields({ name: "`Combo`", value: `**${userRecentData.maxcombo}**x / ${mapData.max_combo}x`,inline: true })
					.addFields({ name: "`Hits`", value: formattedHits, inline: true });
				
				if (currentMode == 3 || userRecentData.maxcombo == mapData.max_combo) {
					embed
						.addFields({ name: "`Map Info`", value: `Length:\`${formattedLength} (${formattedHitLength})\` BPM:\`${BPM}\` Objects:\`${objectCount}\` \n  CS:\`${Cs}\` AR:\`${Ar}\` OD:\`${Od}\` HP:\`${Hp}\` Stars:\`${ssPp.sr.toFixed(2)}\``, inline: true })
						.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
						.setTimestamp()
						.setFooter({ text: `${mapStatus} mapset of ${mapData.creator}`, iconURL: mapperIconUrl });
				} else {
					embed
						.addFields({ name: "`If FC`", value: `**${ifFCPP.toFixed(2)}** / ${ssPp.pp.toFixed(2)}PP`, inline: true })
						.addFields({ name: "`Acc`", value: `${ifFCAcc}%`, inline: true })
						.addFields({ name: "`Hits`", value: formattedIfFCHits, inline: true })
						.addFields({ name: "`Map Info`", value: `Length:\`${formattedLength} (${formattedHitLength})\` BPM:\`${BPM}\` Objects:\`${objectCount}\` \n  CS:\`${Cs}\` AR:\`${Ar}\` OD:\`${Od}\` HP:\`${Hp}\` Stars:\`${ssPp.sr.toFixed(2)}\``, inline: true })
						.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
						.setTimestamp()
						.setFooter({ text: `${mapStatus} mapset of ${mapData.creator}`, iconURL: mapperIconUrl });
				}

				let ifFCMessage = `(**${ifFCPP.toFixed(2)}**pp for ${ifFCAcc}% FC)`;
				if (currentMode == 3) ifFCMessage = "";
				if (userRecentData.maxcombo == mapData.max_combo) ifFCMessage = "**Full Combo!! Congrats!!**";
				if (recentPp.toString().replace(".", "").includes("727")) ifFCMessage = "**WYSI!! WYFSI!!!!!**"

				await message.channel.send({ embeds: [embed] }).then((sentMessage) => {
					setTimeout(async () => {
						const embednew = new EmbedBuilder()
							.setColor("Blue")
							.setTitle(`${mapData.artist} - ${mapData.title} [${mapData.version}] [${ssPp.sr.toFixed(2)}★]`)
							.setThumbnail(osuLibrary.URLBuilder.thumbnailURL(mapData.beatmapset_id))
							.setURL(maplink)
							.setAuthor({ name: `${playersdata.username}: ${Number(playersdata.pp_raw).toLocaleString()}pp (#${Number(playersdata.pp_rank).toLocaleString()} ${playersdata.country}${Number(playersdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconUrl, url: playerUrl })
							.addFields({ name: rankingString, value: `${rankconverter(userRecentData.rank)} + **${mods.str}**　**Score**: ${Number(userRecentData.score).toLocaleString()}　**Acc**: ${recentAcc}% \n **PP**: **${recentPp}** / ${ssPp.pp.toFixed(2)}pp　${ifFCMessage} \n **Combo**: **${userRecentData.maxcombo}**x / ${mapData.max_combo}x　**Hits**: ${formattedHits}`, inline: true });
						await sentMessage.edit({ embeds: [embednew] });
					}, 20000);
				});
				return;
			}
			
			if (/^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/.test(message.content) || /^https:\/\/osu\.ppy\.sh\/b\/\d+$/.test(message.content) || /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/.test(message.content)) {
				const channelid = message.channel.id;
				const allchannels = JSON.parse(fs.readFileSync("./ServerDatas/BeatmapLinkChannels.json", "utf-8"));
				if (!allchannels.Channels.includes(channelid)) return;

				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				if (!(regex.test(message.content) || regex2.test(message.content) || regex3.test(message.content))) {
					await message.reply(`ビートマップリンクの形式が間違っています。`);
					return;
				}

				let mode;
				let mapData;
				let mapUrl;
				if (regex.test(message.content)) {
					switch (message.content.split("#")[1].split("/")[0]) {
						case "osu":
							mode = 0;
							break;
	
						case "taiko":
							mode = 1;
							break;
	
						case "fruits":
							mode = 2;
							break;
	
						case "mania":
							mode = 3;
							break;
	
						default:
							return;
					}
					mapData = await new osuLibrary.GetMapData(message.content, apikey, mode).getData();
					mapUrl = message.content;
				} else {
					mapData = await new osuLibrary.GetMapData(message.content, apikey).getDataWithoutMode();
					mode = Number(mapData.mode);
					mapUrl = osuLibrary.URLBuilder.beatmapURL(mapData.beatmapset_id, mode, mapData.beatmap_id);
				}

				const mapperData = await new osuLibrary.GetUserData(mapData.creator, apikey, mode).getData();
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mapperData?.user_id);

				const calculator = new osuLibrary.CalculatePPSR(mapData.beatmap_id, 0, mode);
				let sr = {};
				for (const element of [95, 99, 100]) {
					calculator.acc = element;
					sr[element] = await calculator.calculateSR();
				}

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setAuthor({ name: `${mapData.artist} - ${mapData.title} by ${mapData.creator}`, iconURL: mapperIconURL, url: mapUrl })
					.setDescription(`**Length**: ${formatTime(Number(mapData.total_length))} (${formatTime(Number(mapData.hit_length))}) **BPM**: ${mapData.bpm} **Mods**: -\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapData.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapData.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapData.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapData.beatmapset_id})`)
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapData.version}__**]`, value: `▸**Difficulty:** ${sr[100].sr.toFixed(2)}★ ▸**Max Combo:** ${mapData.max_combo}x\n▸**OD:** ${mapData.diff_overall} ▸**CS:** ${mapData.diff_size} ▸**AR:** ${mapData.diff_approach} ▸**HP:** ${mapData.diff_drain}\n▸**PP**: ○ **95**%-${sr[95].pp.toFixed(2)} ○ **99**%-${sr[99].pp.toFixed(2)} ○ **100**%-${sr[100].pp.toFixed(2)}`, inline: false })
					.setTimestamp()
					.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
					.setFooter({ text: `${osuLibrary.Tools.mapstatus(mapData.approved)} mapset of ${mapData.creator}` });
				await message.channel.send({ embeds: [embed] });
				return;
			}

			if (message.content.split(" ")[0] == "!m") {
				if (message.content == "!m") {
					await message.reply("使い方: !m [Mods]");
					return;
				}

				const messageData = await message.channel.messages.fetch();
				const messages = Array.from(messageData.values());
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				let maplinks = messages.map(message => {
					if (regex.test(message.content) || regex2.test(message.content) || regex3.test(message.content)) return message.content;
					if (regex.test(message.embeds[0]?.data?.url) || regex2.test(message.embeds[0]?.data?.url) || regex3.test(message.embeds[0]?.data?.url)) return message.embeds[0].data.url;
					if (regex.test(message.embeds[0]?.author?.url) || regex2.test(message.embeds[0]?.author?.url) || regex3.test(message.embeds[0]?.author?.url)) return message.embeds[0].data.author.url;
				});
				maplinks = maplinks.filter(link => link != undefined);
				if (maplinks[0] == undefined) {
					await message.reply("直近50件のメッセージからマップリンクが見つかりませんでした。");
					return;
				}
				let recentmaplink = maplinks[0];

				if (message.content.split(" ")[1] == undefined) {
					await message.reply("Modsを入力してください。");
					return;
				}
				
				if (message.content.split(" ")[1] == "") {
					await message.reply("Modsの前の空白が1つ多い可能性があります。");
					return;
				}

				const Mods = new osuLibrary.Mod(message.content.split(" ")[1]).get();

				if (!Mods) {
					await message.reply("Modが存在しないか、指定できないModです。");
					return;
				}
				
				let mode;
				let mapData;
				let mapUrl;
				if (regex.test(recentmaplink)) {
					switch (recentmaplink.split("#")[1].split("/")[0]) {
						case "osu":
							mode = 0;
							break;
	
						case "taiko":
							mode = 1;
							break;
	
						case "fruits":
							mode = 2;
							break;
	
						case "mania":
							mode = 3;
							break;
	
						default:
							await message.reply("リンク内のモードが不正です。");
							return;
					}
					mapData = await new osuLibrary.GetMapData(recentmaplink, apikey, mode).getData();
					mapUrl = recentmaplink;
				} else {
					mapData = await new osuLibrary.GetMapData(recentmaplink, apikey).getDataWithoutMode();
					mode = Number(mapData.mode);
					mapUrl = osuLibrary.URLBuilder.beatmapURL(mapData.beatmapset_id, mode, mapData.beatmap_id);
				}

				const mapperData = await new osuLibrary.GetUserData(mapData.creator, apikey, mode).getData();
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mapperData?.user_id);

				const calculator = new osuLibrary.CalculatePPSR(mapData.beatmap_id, Mods.calc, mode);
				let sr = {};
				for (const element of [95, 99, 100]) {
					calculator.acc = element;
					sr[element] = await calculator.calculateSR();
				}

				let totalLength = Number(mapData.total_length);
				let totalHitLength = Number(mapData.hit_length);
				let BPM = Number(mapData.bpm);
				if (Mods.array.includes("NC") || Mods.array.includes("DT")) {
					BPM *= 1.5;
					totalLength /= 1.5;
					totalHitLength /= 1.5;
				} else if (Mods.array.includes("HT")) {
					BPM *= 0.75;
					totalLength /= 0.75;
					totalHitLength /= 0.75;
				}

				let Ar = Number(mapData.diff_approach);
				let Od = Number(mapData.diff_overall);
				let Cs = Number(mapData.diff_size);
				let Hp = Number(mapData.diff_drain);

				if (Mods.array.includes("HR")) {
					Od *= 1.4;
					Ar *= 1.4;
					Cs *= 1.3;
					Hp *= 1.4;
				} else if (Mods.array.includes("EZ")) {
					Od *= 0.5;
					Ar *= 0.5;
					Cs *= 0.5;
					Hp *= 0.5;
				}
				Od = Math.max(0, Math.min(10, Od));
				Cs = Math.max(0, Math.min(7, Cs));
				Hp = Math.max(0, Math.min(10, Hp));
				Ar = Math.max(0, Math.min(10, Ar));
				Od = Math.round(Od * 10) / 10;
				Cs = Math.round(Cs * 10) / 10;
				Hp = Math.round(Hp * 10) / 10;
				Ar = Math.round(Ar * 10) / 10;

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setAuthor({ name: `${mapData.artist} - ${mapData.title} by ${mapData.creator}`, iconURL: mapperIconURL, url: mapUrl })
					.setDescription(`**Length**: ${formatTime(totalLength)} (${formatTime(totalHitLength)}) **BPM**: ${BPM} **Mods**: ${Mods.str}\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapData.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapData.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapData.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapData.beatmapset_id})`)
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapData.version}__**]`, value: `▸**Difficulty:** ${sr[100].sr.toFixed(2)}★ ▸**Max Combo:** ${mapData.max_combo}x\n▸**OD:** ${Od} ▸**CS:** ${Cs} ▸**AR:** ${Ar} ▸**HP:** ${Hp}\n▸**PP**: ○ **95**%-${sr[95].pp.toFixed(2)} ○ **99**%-${sr[99].pp.toFixed(2)} ○ **100**%-${sr[100].pp.toFixed(2)}`, inline: false })
					.setTimestamp()
					.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
					.setFooter({ text: `${osuLibrary.Tools.mapstatus(mapData.approved)} mapset of ${mapData.creator}` });
				await message.channel.send({ embeds: [embed] });
				return;
			}

			if (message.content.split(" ")[0] == "!c") {
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				let playername;
				let maplink;
				if (regex.test(message.content.split(" ")[1]) || regex2.test(message.content.split(" ")[1]) || regex3.test(message.content.split(" ")[1])) {
					maplink = message.content.split(" ")[1];
					if (message.content.split(" ")[2] == undefined) {
						const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
						const username = allUser["Bancho"][message.author.id]?.name;
						if (username == undefined) {
							await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
							return;
						}
						playername = username;
					} else {
						playername = message.content.split(" ")?.slice(2)?.join(" ");
					}
				} else if (message.content.split(" ")[1] == undefined) {
					const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						return;
					}
					playername = username;
					const messageData = await message.channel.messages.fetch();
					const messages = Array.from(messageData.values());
					let maplinks = messages.map(message => {
						if (regex.test(message.content) || regex2.test(message.content) || regex3.test(message.content)) return message.content;
						if (regex.test(message.embeds[0]?.data?.url) || regex2.test(message.embeds[0]?.data?.url) || regex3.test(message.embeds[0]?.data?.url)) return message.embeds[0].data.url;
						if (regex.test(message.embeds[0]?.author?.url) || regex2.test(message.embeds[0]?.author?.url) || regex3.test(message.embeds[0]?.data?.url)) return message.embeds[0].data.author.url;
					});
					maplinks = maplinks.filter(link => link != undefined);
					if (maplinks[0] == undefined) {
						await message.reply("直近50件のメッセージからマップリンクが見つかりませんでした。");
						return;
					}
					maplink = maplinks[0];
				} else {
					playername = message.content.split(" ")?.slice(1)?.join(" ");
					const messageData = await message.channel.messages.fetch();
					const messages = Array.from(messageData.values());
					let maplinks = messages.map(message => {
						if (regex.test(message.content) || regex2.test(message.content) || regex3.test(message.content)) return message.content;
						if (regex.test(message.embeds[0]?.data?.url) || regex2.test(message.embeds[0]?.data?.url) || regex3.test(message.embeds[0]?.data?.url)) return message.embeds[0].data.url;
						if (regex.test(message.embeds[0]?.author?.url) || regex2.test(message.embeds[0]?.author?.url) || regex3.test(message.embeds[0]?.author?.url)) return message.embeds[0].data.author.url;
						return "No Link";
					});
					maplinks = maplinks.filter(link => link != "No Link");
					if (maplinks[0] == undefined) {
						await message.reply("直近50件のメッセージからマップリンクが見つかりませんでした。");
						return;
					}
					maplink = maplinks[0];
				}
				
				if (playername == "") {
					await message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
					return;
				}

				let mapData;
				let mode;
				let mapUrl;
				if (regex.test(maplink)) {
					switch (maplink.split("#")[1].split("/")[0]) {
						case "osu":
							mode = 0;
							break;
							
						case "taiko":
							mode = 1;
							break;

						case "fruits":
							mode = 2;
							break;

						case "mania":
							mode = 3;
							break;

						default:
							await message.reply("リンク内のモードが不正です。");
							return;
					}
					mapData = await new osuLibrary.GetMapData(maplink, apikey, mode).getData();
					mapUrl = maplink;
				} else {
					mapData = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
					mode = Number(mapData.mode);
					mapUrl = osuLibrary.URLBuilder.beatmapURL(mapData.beatmapset_id, mode, mapData.beatmap_id);
				}

				const userPlays = await new osuLibrary.GetUserScore(playername, apikey, mode).getScoreDataWithoutMods(mapData.beatmap_id);
				if (userPlays.length == 0) {
					await message.reply("スコアデータが見つかりませんでした。");
					return;
				}

				const mapRankingData = await axios.get(`https://osu.ppy.sh/api/get_scores?k=${apikey}&b=${mapData.beatmap_id}&m=${mode}&limit=50`).then((responce) => {
					return responce.data;
				});

				let mapScores = [];
				for (const element of mapRankingData) {
					mapScores.push(Number(element.score));
				}
				let mapRanking = mapScores.length + 1;

				if (Number(userPlays[0].score) >= mapScores[mapScores.length - 1]) {
					mapScores.sort((a, b) => a - b);
					const score = Number(userPlays[0].score);
					for (const element of mapScores) {
						if (score >= element) {
							mapRanking--;
						} else {
							break;
						}
					}
				}

				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				let BPranking = 1;
				let foundFlag = false;
				for (const element of userplays) {
					if (element.beatmap_id == mapData.beatmap_id && element.score == userPlays[0].score) {
						foundFlag = true;
						break;
					}
					BPranking++;
				}

				if (!foundFlag) {
					userplays.reverse();
					BPranking = userplays.length + 1;
					for (const element of userplays) {
						if (Number(userPlays[0].pp) > Number(element.pp)) {
							BPranking--;
						} else {
							break;
						}
					}
				}

				let rankingString = "";
				const mapStatus = osuLibrary.Tools.mapstatus(mapData.approved);
				if (mapRanking <= 50 && BPranking <= 50 && userPlays[0].rank != "F" && (mapStatus == "Ranked" || mapStatus == "Qualified" || mapStatus == "Loved" || mapStatus == "Approved")) {
					if (mapStatus == "Ranked" || mapStatus == "Approved") {
						rankingString = `**__Personal Best #${BPranking} and Global Top #${mapRanking}__**`;
					} else {
						rankingString = `**__Personal Best #${BPranking} (No Rank) and Global Top #${mapRanking}__**`;
					}
				} else if (mapRanking == 51 && BPranking <= 50 && userPlays[0].rank != "F") {
					if (mapStatus == "Ranked" || mapStatus == "Approved") {
						rankingString = `**__Personal Best #${BPranking}__**`;
					} else {
						rankingString = `**__Personal Best #${BPranking} (No Rank)__**`;
					}
				} else if (mapRanking <= 50 && BPranking > 50 && userPlays[0].rank != "F" && (mapStatus == "Ranked" || mapStatus == "Qualified" || mapStatus == "Loved" || mapStatus == "Approved")) {
					rankingString = `**__Global Top #${mapRanking}__**`;
				} else {
					rankingString = "`Result`";
				}

				const bestMods = new osuLibrary.Mod(userPlays[0].enabled_mods).get();
				const calculator = new osuLibrary.CalculatePPSR(mapData.beatmap_id, bestMods.calc, mode);
				const srppData = await calculator.calculateSR();
				const playersdata = await new osuLibrary.GetUserData(playername, apikey, mode).getData();
				const mappersdata = await new osuLibrary.GetUserData(mapData.creator, apikey, mode).getData();
				const playerIconUrl = osuLibrary.URLBuilder.iconURL(playersdata?.user_id);
				const playerUrl = osuLibrary.URLBuilder.userURL(playersdata?.user_id);
				const mapperIconUrl = osuLibrary.URLBuilder.iconURL(mappersdata?.user_id);
				const userBestPlays = {
					n300: Number(userPlays[0].count300),
					n100: Number(userPlays[0].count100),
					n50: Number(userPlays[0].count50),
					nMisses: Number(userPlays[0].countmiss),
					nGeki: Number(userPlays[0].countgeki),
					nKatu: Number(userPlays[0].countkatu)
				};
				const recentAcc = tools.accuracy({
					300: userPlays[0].count300,
					100: userPlays[0].count100,
					50: userPlays[0].count50,
					0: userPlays[0].countmiss,
					geki : userPlays[0].countgeki,
					katu: userPlays[0].countgeki
				}, modeConvertAcc(mode));
				const userPlaysHit = formatHits(userBestPlays, mode);
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapData.artist} - ${mapData.title} [${mapData.version}]`)
					.setThumbnail(osuLibrary.URLBuilder.thumbnailURL(mapData.beatmapset_id))
					.setURL(mapUrl)
					.setAuthor({ name: `${playersdata.username}: ${Number(playersdata.pp_raw).toLocaleString()}pp (#${Number(playersdata.pp_rank).toLocaleString()} ${playersdata.country}${Number(playersdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconUrl, url: playerUrl })
					.addFields({ name: rankingString, value: `${rankconverter(userPlays[0].rank)} **+ ${bestMods.str}** [${srppData.sr.toFixed(2)}★] **Score**: ${Number(userPlays[0].score).toLocaleString()} **Acc**: ${recentAcc}% \n **PP**: **${Number(userPlays[0].pp).toFixed(2)}** / ${srppData.pp.toFixed(2)}PP **Combo**: **${userPlays[0].maxcombo}x** / ${mapData.max_combo}x \n${userPlaysHit}`, inline: false })
				if (userPlays.length > 1) {
					let valueString = "";
					for (let i = 1; i < Math.min(userPlays.length, 5); i++) {
						const Mods = new osuLibrary.Mod(userPlays[i].enabled_mods).get();
						calculator.mods = Mods.calc;
						const srppData = await calculator.calculateSR();
						const acc = tools.accuracy({
							300: userPlays[i].count300,
							100: userPlays[i].count100,
							50: userPlays[i].count50,
							0: userPlays[i].countmiss,
							geki : userPlays[i].countgeki,
							katu: userPlays[i].countgeki
						}, modeConvertAcc(mode));
						valueString += `${rankconverter(userPlays[i].rank)} + **${Mods.str}** [${srppData.sr.toFixed(2)}★] ${Number(userPlays[i].pp).toFixed(2)}pp (${acc}%) ${userPlays[i].maxcombo}x Miss: ${userPlays[i].countmiss}\n`;
					}
					embed
						.addFields({ name: "__Other scores on the beatmap:__", value: valueString, inline: false });
				}
				embed
					.setTimestamp()
					.setFooter({ text: `${mapStatus} mapset of ${mapData.creator}`, iconURL: mapperIconUrl });
				await message.channel.send({ embeds: [embed] });
			}

			if (message.content.split(" ")[0].startsWith("!wi")) {
				if (message.content == "!wi") {
					await message.reply("使い方: !wi[o, t, c, m] [PP] (osu!ユーザーネーム)");
					return;
				}

				await message.reply("現在、この機能は開発中です。完成までお待ち下さい！");
				return;

				let enteredpp;
				if (message.content.split(" ")[1] == undefined) {
					await message.reply("ppを入力してください。");
					return;
				}

				if (message.content.split(" ")[1] == "") {
					await message.reply("ppの前の空白が1つ多い可能性があります。");
					return;
				}

				if (!RegExp(/^[\d.]+$/).exec(message.content.split(" ")[1]) || isNaN(Number(message.content.split(" ")[1]))) {
					await message.reply("ppは数字のみで構成されている必要があります。");
					return;
				}

				enteredpp = Number(message.content.split(" ")[1]);

				let playername;
				if (message.content.split(" ")[2] == undefined) {
					const allUser = JSON.parse(fs.readFileSync("./ServerDatas/PlayerData.json", "utf-8"));
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						return;
					}
					playername = username;
				} else {
					playername = message.content.split(" ")?.slice(2)?.join(" ");
				}

				if (playername == "") {
					await message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
					return;
				}

				let mode = "";
				let modeforranking = "";
				switch (message.content.split(" ")[0]) {
					case "!wio":
						mode = "0";
						modeforranking = "osu";
						break;

					case "!wit":
						mode = "1";
						modeforranking = "taiko";
						break;

					case "!wic":
						mode = "2";
						modeforranking = "fruits";
						break;

					case "!wim":
						mode = "3";
						modeforranking = "mania";
						break;

					default:
						await message.reply("モードの指定方法が間違っています。ちゃんと存在するモードを選択してください。");
						return;
				}

				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				const oldpp = [];
				const pp = [];
				for (const element of userplays) {
					oldpp.push(Number(element.pp));
					pp.push(Number(element.pp));
				}
				pp.push(enteredpp);
				oldpp.sort((a, b) => b - a);
				pp.sort((a, b) => b - a);

				if (enteredpp == pp[pp.length - 1]) {
					await message.reply("PPに変動は有りません。");
					return;
				} else {
					pp.pop();
				}
				
				const userdata = await new osuLibrary.GetUserData(playername, apikey, mode).getData();
				const scorepp = osuLibrary.CalculateGlobalPP.calculate(oldpp, Number(userdata.playcount));
				const bonusPP = userdata.pp_raw - scorepp;

				let currentBonusPP = 0;
				let currentPlaycount = 0;
				while (currentBonusPP < bonusPP) {
					currentBonusPP = 416.6667 * (1 - Math.pow(0.9994, currentPlaycount));
					currentPlaycount++;
				}
				let globalPP = 0;
				globalPP += osuLibrary.CalculateGlobalPP.calculate(pp, userdata.playcount + 1);
				globalPP += 416.6667 * (1 - Math.pow(0.9994, currentPlaycount + 1));
				let bpRanking = oldpp.length + 1;
				oldpp.sort((a, b) => a - b);
				for (const element of oldpp) {
					if (enteredpp > element) bpRanking--;
				}

				let ranking = 0;
				let foundflag = false;
				const playerIconURL = osuLibrary.URLBuilder.iconURL(userdata?.user_id);
				const playerUserURL = osuLibrary.URLBuilder.userURL(userdata?.user_id);

				await message.reply("ランキングを取得しています。");
				try {
					await auth.login(osuclientid, osuclientsecret);
					for (let page = 0; page < 120; page++) {
						const object = { "cursor[page]": page + 1 };
						let rankingdata = await v2.ranking.details(modeforranking, "performance", object);
						if (globalPP > rankingdata.ranking[rankingdata.ranking.length - 1].pp) {
							foundflag = true;
							for (let position = 0; position < 50; position++) {
								if (globalPP > rankingdata.ranking[position].pp) {
									ranking = (page * 50) + position + 1;
									break;
								}
							}
						}
						if (foundflag) break;
					}
				} catch (e) {
					await message.reply("ランキングの取得に失敗しました。");
					const notfoundembed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`What if ${playername} got a new ${enteredpp}pp score?`)
						.setDescription(`A ${enteredpp}pp play would be ${playername}'s #${bpRanking} best play.\nTheir pp would change by **+${(Math.round((globalPP - Number(userdata.pp_raw)) * 100) / 100).toLocaleString()}** to **${(Math.round(globalPP * 100) / 100).toLocaleString()}pp** and they would reach approx. Ranking wasn't loaded;-;.`)
						.setThumbnail(playerIconURL)
						.setAuthor({ name: `${userdata.username}: ${Number(userdata.pp_raw).toLocaleString()}pp (#${Number(userdata.pp_rank).toLocaleString()} ${userdata.country}${Number(userdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconURL, url: playerUserURL });
					await message.channel.send({ embeds: [notfoundembed] });
					return;
				}

				if (!foundflag) {
					const notfoundembed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`What if ${playername} got a new ${enteredpp}pp score?`)
						.setDescription(`A ${enteredpp}pp play would be ${playername}'s #${bpRanking} best play.\nTheir pp would change by **+${(Math.round((globalPP - Number(userdata.pp_raw)) * 100) / 100).toLocaleString()}** to **${(Math.round(globalPP * 100) / 100).toLocaleString()}pp** and they would reach approx. rank <#6000(Calculations are not available after page 120.).`)
						.setThumbnail(playerIconURL)
						.setAuthor({ name: `${userdata.username}: ${Number(userdata.pp_raw).toLocaleString()}pp (#${Number(userdata.pp_rank).toLocaleString()} ${userdata.country}${Number(userdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconURL, url: playerUserURL });
					await message.channel.send({ embeds: [notfoundembed] });
					return;
				}

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`What if ${playername} got a new ${enteredpp}pp score?`)
					.setDescription(`A ${enteredpp}pp play would be ${playername}'s #${bpRanking} best play.\nTheir pp would change by **+${(Math.round((globalPP - Number(userdata.pp_raw)) * 100) / 100).toLocaleString()}** to **${(Math.round(globalPP * 100) / 100).toLocaleString()}pp** and they would reach approx. rank #${ranking.toLocaleString()} (+${(userdata.pp_rank - ranking).toLocaleString()}).`)
					.setThumbnail(playerIconURL)
					.setAuthor({ name: `${userdata.username}: ${Number(userdata.pp_raw).toLocaleString()}pp (#${Number(userdata.pp_rank).toLocaleString()} ${userdata.country}${Number(userdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconURL, url: playerUserURL });
				await message.channel.send({ embeds: [embed] });
				return;
			}

			if (fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`) && message.content.endsWith("?")) {
				if (message.author.bot) return;

				const answer = message.content.replace("?", "").toLowerCase().replace(/ /g, "");

				const rawjson = fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8");
				const parsedjson = JSON.parse(rawjson);
				let currenttitle = "";
				let isperfect;
				let foundflagforjson = false;

				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						currenttitle = element.name;
						isperfect = element.Perfect;
					}
				}

				const currentanswer = currenttitle.toLowerCase().replace(/ /g, "");

				if (answer == currentanswer) {
					await message.reply("正解です！");
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true;
							element.quizstatus = true;
							element.Answerer = `:o::clap:${message.author.username}`;
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のBGを表示します。`);
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								await message.channel.send({ files: [{ attachment: BGdata, name: 'background.jpg' }] });
								return;
							} else {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のプレビューを再生します。`);
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								await message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
								return;
							}
						}
					}

					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
						let answererstring = "";
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`;
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
							}
						}
						await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`);
					}
					return;
				} else if (matchPercentage(answer, currentanswer) > 90 && !isperfect) {
					await message.reply(`ほぼ正解です！答え: ${currenttitle}`);
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true;
							element.quizstatus = true;
							element.Answerer = `:o:${message.author.username}`;
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のBGを表示します。`);
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								await message.channel.send({ files: [{ attachment: BGdata, name: 'background.jpg' }] });
								return;
							} else {
								foundflagforafterjsonanswer = true
								await message.channel.send(`問題${element.number}のプレビューを再生します。`)
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								await message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
								return;
							}
						}
					}

					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
						let answererstring = "";
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`;
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
							}
						}
						await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
					}
					return;
				} else if (matchPercentage(answer, currentanswer) > 50 && !isperfect) {
					await message.reply(`半分正解です！ 答え: ${currenttitle}`);
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true;
							element.quizstatus = true;
							element.Answerer = `:o:${message.author.username}`;
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のBGを表示します。`);
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								await message.channel.send({ files: [{ attachment: BGdata, name: 'background.jpg' }] });
								return;
							} else {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のプレビューを再生します。`);
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								await message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
								return;
							}
						}
					}

					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
						let answererstring = "";
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`;
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
							}
						}
						await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`);
					}
					return;
				} else if (matchPercentage(answer, currentanswer) > 35 && !isperfect) {
					await message.reply(`惜しかったです！ 答え: ${currenttitle}`)
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true;
							element.quizstatus = true;
							element.Answerer = `:o:${message.author.username}`;
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のBGを表示します。`);
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								await message.channel.send({ files: [{ attachment: BGdata, name: 'background.jpg' }] });
								return;
							} else {
								foundflagforafterjsonanswer = true;
								await message.channel.send(`問題${element.number}のプレビューを再生します。`);
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								await message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
								return;
							}
						}
					}

					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
						let answererstring = "";
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`;
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
							}
						}
						await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`);
					}
					return;
				} else {
					await message.reply(`不正解です;-; 答えの約${Math.round(matchPercentage(answer, currentanswer))}%を入力しています。`);
					return;
				}
			}

			if (message.content == "!skip") {
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					await message.reply("クイズが開始されていません。");
					return;
				}

				const rawjson = fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8");
				const parsedjson = JSON.parse(rawjson);
				let currenttitle = "";
				let foundflagforjson = false;
				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						currenttitle = element.name;
					}
				}

				await message.reply(`答え: ${currenttitle}`);

				let foundflagforans = false;
				for (let element of parsedjson) {
					if (!element.quizstatus && !foundflagforans) {
						foundflagforans = true;
						element.quizstatus = true;
						element.Answerer = `:x:${message.author.username}さんによってスキップされました。`;
						fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
					}
				}

				const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
				let foundflagforafterjsonanswer = false;
				for (const element of afterjson) {
					if (!element.quizstatus && !foundflagforafterjsonanswer) {
						if (element.mode == "BG") {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のBGを表示します。`);
							const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
							const BGdata = response.data;
							await message.channel.send({ files: [{ attachment: BGdata, name: 'background.jpg' }] });
							return;
						} else {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のプレビューを再生します。`);
							const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
							const audioData = response.data;
							await message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] });
							return;
						}
					}
				}

				if (!foundflagforafterjsonanswer) {
					const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let answererstring = "";
					for (let i = 0; i < answererarray.length; i++) {
						if (answererarray[i].Answerer == "") continue;
						answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
					}
					await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
					fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`);
				}
				return;
			}

			if (message.content == "!hint") {
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					await message.reply("クイズが開始されていません。");
					return;
				}

				const parsedjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
				let currenttitle = "";
				let foundflagforjson = false;
				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						if (element.hint) {
							await message.reply("ヒントは１問につき１回まで使用できます。");
							return;
						}
						currenttitle = element.name;
						element.hint = true;
						fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
					}
				}

				const hidecount = Math.round(currenttitle.replace(" ", "").length / 3);

				let randomarray = [];
				while (randomarray.length < hidecount) {
					const randomnumber = Math.floor(Math.random() * currenttitle.length);
					if (!randomarray.includes(randomnumber) && currenttitle[randomnumber] != " ") randomarray.push(randomnumber);
				}

				let hint = "";
				for (let i = 0; i < currenttitle.length; i++) {
					if (currenttitle[i] == " ") {
						hint += " ";
						continue;
					}
					if (randomarray.includes(i)) {
						hint += currenttitle[i];
					} else {
						hint += "◯";
					}
				}

				await message.reply(`ヒント: ${hint}(計${hidecount}文字表示されています。タイトルは${currenttitle.replace(" ", "").length}文字です。)`);
				return;
			}

			if (message.content == "!ero") {
				if (Math.floor(Math.random() * 10) == 0) {
					let eroVideo = fs.readFileSync("./eroaru.mp4");
					await message.reply({ files: [{ attachment: eroVideo, name: 'donarudo.mp4' }] });
					eroVideo = null;
					return;
				} else {
					let eroVideo = fs.readFileSync("./eronai.mp4");
					await message.reply({ files: [{ attachment: eroVideo, name: 'donarudo.mp4' }] });
					eroVideo = null;
					return
				}
			}

			if (message.content == "h!help") {
				const commandInfo = {
					"h!help": "コマンドのヘルプを表示します。",
					"!map [maplink] (mods) (acc)": "指定した譜面の情報を表示します。modsとaccは省略可能です。",
					"!c (maplink) (username)": "ユーザーのそのマップでの記録(最大5個)を表示します。usernameは登録していれば省略可能です。マップリンクも省略可です。",
					"!r(o, t, c, m) (username)": "ユーザーの最新のosu!std、taiko、catch、maniaの記録を表示します。usernameは登録していれば省略可能です。stdは!rでも!roでも実行可能です。",
					"!wi[o, t, c, m] [pp] (username)": "ユーザーが指定したppを新しく取得したときのppとランキングを表示します。usernameは省略可能です。(開発中)",
					"!m [mods]": "直近に送信された譜面にmodsをつけてppを表示します。/linkコマンドで有効になります。",
					"!skip": "osubgquiz、osubgquizpf、osuquiz、osuquizpfコマンドで使用できます。現在の問題をスキップします。",
					"!hint": "osubgquiz、osubgquizpf、osuquiz、osuquizpfコマンドで使用できます。現在の問題のヒントを表示します。",
					"!ero": "エロあるよ（笑）が10%の確率で出ます。",
					"〇〇?": "クイズの答えを送信します。クイズが有効になっているときに使用できます。",
					"四則演算式(1+1, 1-1, 1*1, 1/1, 1^1など)": "計算機です。チャットに書かれると計算します。",
					"時間計算(123.7時間、123.7分など)": "時間計算機です。チャットに書かれると時間を計算します。"
				};
			
				let sendMessage = "__\*\*コマンド一覧\*\*\__\n";
				for (const [key, value] of Object.entries(commandInfo)) {
					sendMessage += `- \`\`\`${key}\`\`\`: ${value}\n`;
				}

				await message.reply(sendMessage);
				return;
			}

			if (RegExp(/^\d+([-+*/^])\d+$/).exec(message.content.replace(/ /g, ""))) {
				const messageContent = message.content.replace(/ /g, "");
				switch (true) {
					case messageContent.includes("+"): {
						let [left, right] = messageContent.split("+");
						if (isNaN(left) || isNaN(right)) return;
						await message.reply(`${left} + ${right} = ${Number(left) + Number(right)}`);
						break;
					}

					case messageContent.includes("-"): {
						let [left, right] = messageContent.split("-");
						if (isNaN(left) || isNaN(right)) return;
						await message.reply(`${left} - ${right} = ${Number(left) - Number(right)}`);
						break;
					}

					case messageContent.includes("*"): {
						let [left, right] = messageContent.split("*");
						if (isNaN(left) || isNaN(right)) return;
						await message.reply(`${left} * ${right} = ${Number(left) * Number(right)}`);
						break;
					}

					case messageContent.includes("/"): {
						let [left, right] = messageContent.split("/");
						if (isNaN(left) || isNaN(right)) return;
						await message.reply(`${left} / ${right} = ${Number(left) / Number(right)}`);
						break;
					}

					case messageContent.includes("^"): {
						let [left, right] = messageContent.split("^");
						if (isNaN(left) || isNaN(right)) return;
						await message.reply(`${left} ^ ${right} = ${Number(left) ** Number(right)}`);
						break;
					}
				}
				return;
			}

			if (/^[0-9.]+時間?$/.test(message.content) && message.content.includes(".") && !/^\.+$/.test(message.content) && message.content.includes("時間")) {
				const totalHours = parseFloat(message.content.split("時間")[0]);
				if (!message.content.split("時間")[0].includes(".")) return;
				await message.reply(`${Math.floor(totalHours)}時間 ${Math.floor((totalHours - Math.floor(totalHours)) * 60)}分 ${Math.round(((totalHours - Math.floor(totalHours)) * 60 - Math.floor((totalHours - Math.floor(totalHours)) * 60)) * 60)}秒`);
			} else if (/^[0-9.]+分?$/.test(message.content) && message.content.includes(".") && !/^\.+$/.test(message.content) && message.content.includes("分")) {
				const totalminutes = parseFloat(message.content.split("分")[0]);
				if (!message.content.split("分")[0].includes(".")) return;
				await message.reply(`${Math.floor(totalminutes)}分 ${Math.round((totalminutes - Math.floor(totalminutes)) * 60)}秒`);
			}

			if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.includes('.avi') || attachment.url.includes('.mov') || attachment.url.includes('.mp4') || attachment.url.includes('.png') || attachment.url.includes('.jpg') || attachment.url.includes('.gif')) && message.channel.id == Furrychannel) {
				if (message.author.bot) return;
				const dataBase = JSON.parse(fs.readFileSync("./Pictures/Furry/DataBase.json", "utf-8"));
				for (const attachment of message.attachments.values()) {
					const imageURL = attachment.url;
					const imageFile = await axios.get(imageURL, { responseType: 'arraybuffer' });
					const extention = imageURL.split(".")[imageURL.split(".").length - 1].split("?")[0];
					const fileNameWithoutExtention = dataBase.PhotoDataBase.map((x) => Number(x.split(".")[0]));
					let filename = 0;
					while (fileNameWithoutExtention.includes(filename)) {
						filename++;
					}
					dataBase.PhotoDataBase.push(filename + "." + extention);
					dataBase.FileCount++;
					fs.writeFileSync(`./Pictures/Furry/${filename}.${extention}`, imageFile.data);
				}
				fs.writeFileSync("./Pictures/Furry/DataBase.json", JSON.stringify(dataBase, null, 4));
				if (message.attachments.size == 1) {
					await message.reply("Furryが保存されました");
				} else {
					await message.reply(`${message.attachments.size}個のFurryが保存されました`);
				}
				return;
			}

			if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.includes('.avi') || attachment.url.includes('.mov') || attachment.url.includes('.mp4') || attachment.url.includes('.png') || attachment.url.includes('.jpg') || attachment.url.includes('.gif'))) {
				if (message.author.bot) return;
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					const dataBase = JSON.parse(fs.readFileSync(`./Pictures/tag/${folder}/DataBase.json`, "utf-8"));
					if (dataBase.id == message.channel.id) {
						let fileNameArray = [];
						for (const attachment of message.attachments.values()) {
							const imageURL = attachment.url;
							const imageFile = await axios.get(imageURL, { responseType: 'arraybuffer' });
							const extention = imageURL.split(".")[imageURL.split(".").length - 1].split("?")[0];
							const fileNameWithoutExtention = dataBase.PhotoDataBase.map((x) => Number(x.split(".")[0]));
							let filename = 0;
							while (fileNameWithoutExtention.includes(filename)) {
								filename++;
							}
							dataBase.PhotoDataBase.push(filename + "." + extention);
							fileNameArray.push(filename + "." + extention);
							dataBase.FileCount++;
							fs.writeFileSync(`./Pictures/tag/${folder}/${filename}.${extention}`, imageFile.data);
						}
						fs.writeFileSync(`./Pictures/tag/${folder}/DataBase.json`, JSON.stringify(dataBase, null, 4));
						if (message.attachments.size == 1) {
							await message.reply(`ファイルが保存されました(${fileNameArray[0]})`);
						} else {
							await message.reply(`${message.attachments.size}個のファイルが保存されました\nファイル名: ${fileNameArray.join(", ")}`);
						}
						return;
					}
				}
			}

			if (!message.content.startsWith("!")) {
				if (message.author.bot || message.content == "") return;
				const allQuotes = JSON.parse(fs.readFileSync("./ServerDatas/Quotes.json", "utf-8"));
				for (const key in allQuotes) {
					if (allQuotes[key].id == message.channel.id) {
						allQuotes[key].quotes.push(message.content);
						fs.writeFileSync("./ServerDatas/Quotes.json", JSON.stringify(allQuotes, null, 4));
						await message.reply(`名言が保存されました`);
						return;
					}
				}
			}
		} catch (e) {
			if (e.message == "No data found") {
				await message.reply("マップが見つかりませんでした。")
					.catch(async () => {
						await client.users.cache.get(message.author.id).send('こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！')
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			} else {
				asciify("Error", { font: "larry3d" }, (err, msg) => {
					if(err) return;
					console.log(msg);
				});
				console.log(e);
				await message.reply(`${message.author.username}さんのコマンドの実行中にエラーが発生しました。`)
					.catch(async () => {
						await client.users.cache.get(message.author.id).send('こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！')
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			}
		}
	}
);

client.on(Events.Error, (error) => {
	asciify("API Error", { font: "larry3d" }, (err, msg) =>{
		if(err) return;
		console.log(msg);
	});
	console.log(`エラー名: ${error.name}\nエラー内容: ${error.message}`);
});

function generateSlotResult() {
	const result = [];
	for (let i = 0; i < 3; i++) {
		const randomIndex = Math.floor(Math.random() * symbols.length);
		result.push(symbols[randomIndex]);
	}
	return result;
}

function evaluateSlotResult(result) {
	switch (true) {
		case result[0] == result[1] && result[1] == result[2]:
			return 30n;
		case result[0] == result[1] || result[1] == result[2]:
			return 10n;
		case result[0] == result[2]:
			return 5n;
		default:
			return 0n;
	}
}

function toJPUnit(num) {
	const str = num;
	if (str.length >= 216) {
		return "約" + `${formatBigInt(str)}`;
	} else {
		let n = "";
		let count = 0;
		let ptr = 0;
		let kName = ["万","億","兆","京","垓","杼","穰","溝","澗","正","載","極","恒河沙","阿僧祇","那由他","不可思議","無量大数","無限超越数","無限超超越数","無限高次超越数","超限大数","超限超越大数","超限高次大数","超超限大数","超超限超越大数","超超限高次大数","超超超限大数","無辺数","無限大数","無限極数","無窮数","無限巨数","無涯数","無辺無数","無窮無数","無限超数","無辺超数","無尽数","無量超数","無辺絶数","無限絶数","イクカン","イガグン","レジギガス","イイググ","イガグググ","イカレジ","イカマニア","イガ","イグ","グイグイ","イクンカ","イカクンガ"]
		for (let i = str.length - 1; i >= 0; i--) {
			n = str.charAt(i) + n;
			count++;
			if ((count % 4 == 0) && (i != 0)) n = kName[ptr++] + n;
		}
		return n;
	}
}

function formatBigInt(num) {
	const str = num.toString();
	if (str.length >= 216) {
		const power = str.length - 1;
		const numstr = str.slice(0, 2) + '.' + str.slice(2, 5).padEnd(3, '0');
	  	return `${numstr} * 10^${power}`;
	}
	return str.toLocaleString();
}

function calcIfFCPP(score, mode, object, passedObjects, calcmods, mapMaxCombo, map) {
	let ifFCPP = 0;
	let ifFCAcc = 100;
	let ifFCHits = {
		n300: 0,
		n100: 0,
		n50: 0,
		nMisses: 0
	};

	switch (mode) {
		case 0: {
			const objects = object.nCircles + object.nSliders + object.nSpinners;
			let n300 = score.n300 + Math.max(0, objects - passedObjects);
			const countHits = objects - score.nMisses;
			const ratio = 1.0 - (n300 / countHits);
			const new100s = Math.ceil(ratio * score.nMisses);
			n300 += Math.max(0, score.nMisses - new100s);
			const n100 = score.n100 + new100s;
			const n50 = score.n50;
			const calcScore = {
				mode: 0,
				mods: calcmods,
				n300: n300,
				n100: n100,
				n50: n50,
				nMisses: 0,
				combo: mapMaxCombo
			};

			ifFCHits.n300 = n300;
			ifFCHits.n100 = n100;
			ifFCHits.n50 = n50;

			const calc = new Calculator(calcScore);
			ifFCPP = calc.performance(map).pp;
			if (isNaN(ifFCPP)) ifFCPP = 0;
			ifFCAcc = Math.round((n300 * 300 + n100 * 100 + n50 * 50) / ((n300 + n100 + n50 + 0) * 300) * 10000) / 100;
			return { ifFCPP, ifFCHits, ifFCAcc };
		}

		case 1: {
			const objects = object.nCircles;
			let n300 = score.n300 + Math.max(0, objects - passedObjects);
			const countHits = objects - score.nMisses;
			const ratio = 1.0 - (n300 / countHits);
			const new100s = Math.ceil(ratio * score.nMisses);
			n300 += Math.max(0, score.nMisses - new100s);
			const n100 = score.n100 + new100s;
			const calcScore = {
				mode: 1,
				mods: calcmods,
				n300: n300,
				n100: n100,
				nMisses: 0
			};

			ifFCHits.n300 = n300;
			ifFCHits.n100 = n100;

			const calc = new Calculator(calcScore);
			ifFCPP = calc.performance(map).pp;
			if (isNaN(ifFCPP)) ifFCPP = 0;
			ifFCAcc = Math.round((100.0 * (2 * n300 + n100)) / (2 * objects) * 100) / 100;
			return { ifFCPP, ifFCHits, ifFCAcc };
		}

		case 2: {
			const objects = object.maxCombo;
			const passedObjectsfor = score.n300 + score.n100 + score.nMisses;
			const missing = objects - passedObjectsfor;
			const missingFruits = Math.max(0, missing - Math.max(0, object.nDroplets - score.n100));
			const missingDroplets = missing - missingFruits;
			const nFruits = score.n300 + missingFruits;
			const nDroplets = score.n100 + missingDroplets;
			const nTinyDropletMisses = score.nKatu;
			const nTinyDroplets = Math.max(0, object.nTinyDroplets - nTinyDropletMisses);
			const calcScore = {
				mode: 2,
				mods: calcmods,
				n300: nFruits,
				n100: nDroplets,
				n50: nTinyDroplets,
				nGeki: score.nGeki,
				nKatu: score.nKatu,
				nMisses: 0,
				combo: object.maxCombo
			};

			ifFCHits.n300 = nFruits;
			ifFCHits.n100 = nDroplets;
			ifFCHits.n50 = nTinyDroplets;

			const calc = new Calculator(calcScore);
			ifFCPP = calc.performance(map).pp;
			if (isNaN(ifFCPP)) ifFCPP = 0;
			ifFCAcc = Math.round((100.0 * (nFruits + nDroplets + nTinyDroplets)) / (nFruits + nDroplets + nTinyDroplets + score.nKatu) * 100) / 100;
			return { ifFCPP, ifFCHits, ifFCAcc };
		}

		case 3: {
			return { ifFCPP, ifFCHits, ifFCAcc };
		}
	}
}

function formatTime(sec) {
	const min = Math.floor(sec / 60);
	const second = Math.floor(sec % 60);
	return `${min}:${second.toString().padStart(2, "0")}`;
}

function formatHits(score, mode) {
	switch (mode) {
		case 0:
			return `{${score.n300}/${score.n100}/${score.n50}/${score.nMisses}}`;

		case 1:
			return `{${score.n300}/${score.n100}/${score.nMisses}}`;

		case 2:
			return `{${score.n300}/${score.n100}/${score.n50}/${score.nMisses}}`;

		case 3:
			return `{${score.nGeki}/${score.n300}/${score.nKatu}/${score.n100}/${score.n50}/${score.nMisses}}`;
	}
}

function findDifferentElements(array1, array2) {
	if (array1.length == 0) return array2.length > 0 ? array2 : null;
	if (array2.length == 0) return null;
	if (array2.length < 15 || array1.length < 15) {
		return array2.filter((x) => !array1.includes(x)).length > 0 ? array2.filter((x) => !array1.includes(x)) : null;
	}

	const diffArray = [];
	const newCharts = array2.filter(chart => !array1.includes(chart) && !array1.includes(chart - 1));
	if (newCharts.length > 0) {
		diffArray.push(...newCharts);
		const filteredDiffArray = diffArray.filter(chart => !array1.includes(chart) && !array1.includes(chart - 1));
		const finalDiffArray = filteredDiffArray.filter((chart, index, array) => {
			return array.indexOf(chart) == index;
		});
		return finalDiffArray.length > 0 ? finalDiffArray : null;
	} else {
		return null;
	}
}

function getFilesSortedByDate(directory) {
	const fileStats = fs.readdirSync(directory).map(file => ({
		name: file,
		stat: fs.statSync(`${directory}/${file}`)
	}));
	fileStats.sort((a, b) => a.stat.mtime.getTime() - b.stat.mtime.getTime());
	return fileStats.map(fileStat => fileStat.name);
}

function rankconverter(rank) {
	switch (rank) {
		case "F":
			return "<:_F:1150129368765579415>";
		case "D":
			return "<:_D:1150129435643756645>";
		case "C":
			return "<:_C:1150129490480070797>";
		case "B":
			return "<:_B:1150129538752319578>";
		case "A":
			return "<:_A:1150129599754277005>";
		case "S":
			return "<:_S:1150129649330946108>";
		case "SH":
			return "<:_SH:1150129639629525085>";
		case "X":
			return "<:_X:1150129643714789417>";
		case "XH":
			return "<:_XH:1150129646055211138>";
		default:
			return "";
	}
}

function isNaNwithNumber(num) {
	return isNaN(num) ? 0 : num;
}

function checkqualified() {
	return new Promise (async resolve => {
		const modeconvertforSearch = (mode) => { return mode == "catch" ? "fruits" : mode; };
		const modeArray = ["osu", "taiko", "catch", "mania"];
		await auth.login(osuclientid, osuclientsecret);
		for (const mode of modeArray) {
			try {
				const qfdatalist = await v2.beatmap.search({
					mode: modeconvertforSearch(mode),
					section: "qualified"
				});
				if (qfdatalist.beatmapsets == undefined) continue;
				let qfarray = [];
				for (let i = 0; i < Math.min(qfdatalist.beatmapsets.length, 15); i++) {
					qfarray.push(qfdatalist.beatmapsets[i].id);
				}
				const allBeatmaps = JSON.parse(fs.readFileSync("./ServerDatas/Beatmaps/Beatmaps.json", "utf-8"));
				const differentQFarray = findDifferentElements(allBeatmaps.Qualified[mode], qfarray);
				allBeatmaps.Qualified[mode] = qfarray;
				fs.writeFileSync("./ServerDatas/Beatmaps/Beatmaps.json", JSON.stringify(allBeatmaps, null, 4), "utf-8");
				if (differentQFarray == null) continue;
				for (const differentQF of differentQFarray) {
					const parsedjson = JSON.parse(fs.readFileSync(`./ServerDatas/Beatmaps/${mode}.json`, "utf-8"));
					let foundflag = false;
					for (const element of parsedjson) {
						if (element.id == differentQF && !foundflag) {
							foundflag = true;
							element.qfdate = new Date();
							element.rankeddate = "-";
							fs.writeFileSync(`./ServerDatas/Beatmaps/${mode}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
							break;
						}
					}

					if (!foundflag) {
						parsedjson.push({
							id: differentQF,
							qfdate: new Date(),
							rankeddate: "-"
						});
						fs.writeFileSync(`./ServerDatas/Beatmaps/${mode}.json`, JSON.stringify(parsedjson, null, 4), "utf-8");
					}

					let QFBeatmapsMaxSrId;
					let QFBeatmapsMinSrId;
					await v2.beatmap.set(differentQF).then((res) => {
						const array = res.beatmaps;
						array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
						const maxRatingObj = array[array.length - 1];
						const minRatingObj = array[0];
						QFBeatmapsMaxSrId = maxRatingObj.id;
						QFBeatmapsMinSrId = minRatingObj.id;
					});

					if (QFBeatmapsMaxSrId == undefined || QFBeatmapsMinSrId == undefined) continue;

					const mapMaxInfo = await new osuLibrary.GetMapData(QFBeatmapsMaxSrId, apikey, modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(QFBeatmapsMinSrId, apikey, modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMaxSrId, 0, modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMinSrId, 0, modeConvertMap(mode));
					const maxsrpp = await maxCalculator.calculateSR();
					const minsrpp = await minCalculator.calculateSR();
					const maxdtpp = await maxCalculator.calculateDT();
					const mindtpp = await minCalculator.calculateDT();
		
					const BPM = `${mapMaxInfo.bpm}BPM (DT ${Math.round(Number(mapMaxInfo.bpm) * 1.5)}BPM)`;
					const maxCombo = mapMaxInfo.max_combo;
					const minCombo = mapMinInfo.max_combo;
					let Objectstring = minCombo == maxCombo ? `${maxCombo}` : `${minCombo} ~ ${maxCombo}`;
					const lengthsec = mapMaxInfo.hit_length;
					const lengthsecDT = Math.round(Number(mapMaxInfo.hit_length) / 1.5);
					const maptime = formatTime(lengthsec);
					const maptimeDT = formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;

					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${formatNumber(hours)}時${formatNumber(minutes)}分`;

					const qfparsedjson = JSON.parse(fs.readFileSync(`./ServerDatas/Beatmaps/${mode}.json`, "utf-8"));
					const averagearray = [];
					for (const element of qfparsedjson) {
						const qfdate = new Date(element.qfdate);
						if (element.rankeddate == "-") continue;
						const rankeddate = new Date(element.rankeddate);
						const rankeddays = Math.floor((rankeddate - qfdate) / (1000 * 60 * 60 * 24));
						if (rankeddays <= 5 || rankeddays >= 8) continue;
						averagearray.push(rankeddate - qfdate);
					}
					let average = averagearray.reduce((sum, element) => sum + element, 0) / averagearray.length;
					if (isNaN(average)) average = 604800000;
		
					const sevenDaysLater = new Date(now.getTime() + average);
					const rankedmonth = sevenDaysLater.getMonth() + 1;
					const rankedday = sevenDaysLater.getDate();
					const rankedhours = sevenDaysLater.getHours();
					const rankedminutes = sevenDaysLater.getMinutes();
					const rankeddateString = `${rankedmonth}月${rankedday}日 ${formatNumber(rankedhours)}時${formatNumber(rankedminutes)}分`;
		
					let srstring = maxsrpp.sr == minsrpp.sr ? `★${maxsrpp.sr.toFixed(2)} (DT ★${maxdtpp.sr.toFixed(2)})` : `★${minsrpp.sr.toFixed(2)} ~ ${maxsrpp.sr.toFixed(2)} (DT ★${mindtpp.sr.toFixed(2)} ~ ${maxdtpp.sr.toFixed(2)})`;
					let ppstring = maxsrpp.pp == minsrpp.pp ? `${maxsrpp.pp.toFixed(2)}pp (DT ${maxdtpp.pp.toFixed(2)}pp)` : `${minsrpp.pp.toFixed(2)} ~ ${maxsrpp.pp.toFixed(2)}pp (DT ${mindtpp.pp.toFixed(2)} ~ ${maxdtpp.pp.toFixed(2)}pp)`;

					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setAuthor({ name: `🎉New Qualified ${mode} Map🎉` })
						.setTitle(`${mapMaxInfo.artist} - ${mapMaxInfo.title} by ${mapMaxInfo.creator}`)
						.setDescription(`**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapMaxInfo.beatmapset_id})`)
						.setThumbnail(`https://b.ppy.sh/thumb/${mapMaxInfo.beatmapset_id}l.jpg`)
						.setURL(`https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}`)
						.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
						.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
						.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
						.addFields({ name: "`Qualified 日時`", value: `**${dateString}**`, inline: true })
						.addFields({ name: "`Ranked 日時(予測)`", value: `**${rankeddateString}**`, inline: true });
					for (const element of JSON.parse(fs.readFileSync(`./ServerDatas/MapcheckChannels.json`, "utf-8")).Qualified[mode]) {
						try {
							if (client.channels.cache?.get(element) == undefined) continue;
							await client.channels.cache.get(element).send({ embeds: [embed] });
							const membersdata = await client.channels.cache.get(element).guild.members.fetch();
							let mentionstring = [];
							const allUser = JSON.parse(fs.readFileSync(`./ServerDatas/MentionUser.json`, "utf-8"));
							const mentionUser = allUser["Qualified"][element]?.[mode];
							if (mentionUser == undefined) continue;
							for (const user of mentionUser) {
								if (membersdata.get(user) == undefined) continue;
								mentionstring.push(`<@${user}>`);
							}
							if (mentionstring.length != 0) {
								await client.channels.cache.get(element).send(`${mentionstring.join(" ")}\n新しい${mode}のQualified譜面が出ました！`);
							}
						} catch {
							continue;
						}
					}
				}
			} catch (e) {
				console.log(e);
				continue;
			}
		}
		resolve();
	});
}

function checkranked() {
	return new Promise (async (resolve) => {
		const modeconvertforSearch = (mode) => { return mode == "catch" ? "fruits" : mode; };
		const modeArray = ["osu", "taiko", "catch", "mania"];
		await auth.login(osuclientid, osuclientsecret);
		for (const mode of modeArray) {
			const rankeddatalist = await v2.beatmap.search({
				mode: modeconvertforSearch(mode),
				section: "ranked"
			});
			if (rankeddatalist.beatmapsets == undefined) continue;
			let rankedarray = [];
			for (let i = 0; i < Math.min(rankeddatalist.beatmapsets.length, 15); i++) {
				rankedarray.push(rankeddatalist.beatmapsets[i].id);
			}
			const allBeatmaps = JSON.parse(fs.readFileSync("./ServerDatas/Beatmaps/Beatmaps.json", "utf-8"));
			const differentrankedarray = findDifferentElements(allBeatmaps.Ranked[mode], rankedarray);
			allBeatmaps.Ranked[mode] = rankedarray;
			fs.writeFileSync("./ServerDatas/Beatmaps/Beatmaps.json", JSON.stringify(allBeatmaps, null, 4), "utf-8");
			if (differentrankedarray == null) continue;
			for (const differentranked of differentrankedarray) {
				try {
					const qfparsedjson = JSON.parse(fs.readFileSync(`./ServerDatas/Beatmaps/${mode}.json`, "utf-8"));
					let rankederrorstring = "取得できませんでした";
					for (const element of qfparsedjson) {
						if (element.id == differentranked) {
							element.rankeddate = new Date();
							fs.writeFileSync(`./ServerDatas/Beatmaps/${mode}.json`, JSON.stringify(qfparsedjson, null, 4), "utf-8");
							const qfdate = new Date(element.qfdate);
							const rankeddate = new Date(element.rankeddate);
							const timeDifference = rankeddate - qfdate;
							const oneDay = 24 * 60 * 60 * 1000;
							const oneHour = 60 * 60 * 1000;
							const oneMinute = 60 * 1000;
							const sevenDays = 7 * oneDay;
							const diff = sevenDays - timeDifference;
							const sign = diff < 0 ? "+" : "-";
							const absDiff = Math.abs(diff);
							const days = Math.floor(absDiff / oneDay);
							const hours = Math.floor((absDiff % oneDay) / oneHour);
							const minutes = Math.floor((absDiff % oneHour) / oneMinute);
							if (days == 0 && hours == 0) {
								rankederrorstring = `${sign} ${minutes}分`;
							} else if (days == 0 && hours != 0) {
								rankederrorstring = `${sign} ${hours}時間 ${minutes}分`;
							} else {
								rankederrorstring = `${sign} ${days}日 ${hours}時間 ${minutes}分`;
							}
							break;
						}
					}
		
					let rankedBeatmapsMaxSrId;
					let rankedBeatmapsMinSrId;
					await v2.beatmap.set(differentranked).then((res) => {
						const array = res.beatmaps;
						array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
						const maxRatingObj = array[array.length - 1];
						const minRatingObj = array[0];
						rankedBeatmapsMaxSrId = maxRatingObj.id;
						rankedBeatmapsMinSrId = minRatingObj.id;
					});
					if (rankedBeatmapsMaxSrId == undefined || rankedBeatmapsMinSrId == undefined) continue;

					const mapMaxInfo = await new osuLibrary.GetMapData(rankedBeatmapsMaxSrId, apikey, modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(rankedBeatmapsMinSrId, apikey, modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(rankedBeatmapsMaxSrId, 0, modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(rankedBeatmapsMinSrId, 0, modeConvertMap(mode));
					const maxsrpp = await maxCalculator.calculateSR();
					const minsrpp = await minCalculator.calculateSR();
					const maxdtpp = await maxCalculator.calculateDT();
					const mindtpp = await minCalculator.calculateDT();
		
					const BPM = `${mapMaxInfo.bpm}BPM (DT ${Math.round(Number(mapMaxInfo.bpm) * 1.5)}BPM)`;
					const maxCombo = mapMaxInfo.max_combo;
					const minCombo = mapMinInfo.max_combo;
					let Objectstring = minCombo == maxCombo ? `${maxCombo}` : `${minCombo} ~ ${maxCombo}`;
					const lengthsec = mapMaxInfo.hit_length;
					const lengthsecDT = Math.round(Number(mapMaxInfo.hit_length) / 1.5);
					const maptime = formatTime(lengthsec);
					const maptimeDT = formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;
		
					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${formatNumber(hours)}時${formatNumber(minutes)}分`;
		
					let srstring = maxsrpp.sr == minsrpp.sr ? `★${maxsrpp.sr.toFixed(2)} (DT ★${maxdtpp.sr.toFixed(2)})` : `★${minsrpp.sr.toFixed(2)} ~ ${maxsrpp.sr.toFixed(2)} (DT ★${mindtpp.sr.toFixed(2)} ~ ${maxdtpp.sr.toFixed(2)})`;
					let ppstring = maxsrpp.pp == minsrpp.pp ? `${maxsrpp.pp.toFixed(2)}pp (DT ${maxdtpp.pp.toFixed(2)}pp)` : `${minsrpp.pp.toFixed(2)} ~ ${maxsrpp.pp.toFixed(2)}pp (DT ${mindtpp.pp.toFixed(2)} ~ ${maxdtpp.pp.toFixed(2)}pp)`;
					const embed = new EmbedBuilder()
						.setColor("Yellow")
						.setAuthor({ name: `🎉New Ranked ${mode} Map🎉` })
						.setTitle(`${mapMaxInfo.artist} - ${mapMaxInfo.title} by ${mapMaxInfo.creator}`)
						.setDescription(`**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapMaxInfo.beatmapset_id})`)
						.setThumbnail(`https://b.ppy.sh/thumb/${mapMaxInfo.beatmapset_id}l.jpg`)
						.setURL(`https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}`)
						.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
						.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
						.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
						.addFields({ name: "`Ranked 日時`", value: `**${dateString}** (誤差: **${rankederrorstring}**)`, inline: true });
					for (const element of JSON.parse(fs.readFileSync(`./ServerDatas/MapcheckChannels.json`, "utf-8")).Qualified[mode]) {
						try {
							if (client.channels.cache?.get(element) == undefined) continue;
							await client.channels.cache.get(element).send({ embeds: [embed] });
							const membersdata = await client.channels.cache.get(element).guild.members.fetch();
							let mentionstring = [];
							const allUser = JSON.parse(fs.readFileSync(`./ServerDatas/MentionUser.json`, "utf-8"));
							const mentionUser = allUser["Ranked"][element]?.[mode];
							if (mentionUser == undefined) continue;
							for (const user of mentionUser) {
								if (membersdata.get(user) == undefined) continue;
								mentionstring.push(`<@${user}>`);
							}
							if (mentionstring.length != 0) {
								await client.channels.cache.get(element).send(`${mentionstring.join(" ")}\n新しい${mode}のRanked譜面が出ました！`);
							}
						} catch {
							continue;
						}
					}
				} catch (e) {
					console.log(e);
					continue;
				}
			}
		}
		resolve();
	});
}

function checkloved() {
	return new Promise(async (resolve) => {
		const modeconvertforSearch = (mode) => { return mode == "catch" ? "fruits" : mode; }
		const modeArray = ["osu", "taiko", "catch", "mania"]
		await auth.login(osuclientid, osuclientsecret);
		for (const mode of modeArray) {
			const loveddatalist = await v2.beatmap.search({
				mode: modeconvertforSearch(mode),
				section: "loved"
			});
			if (loveddatalist.beatmapsets == undefined) continue;
			let lovedarray = [];
			for (let i = 0; i < Math.min(loveddatalist.beatmapsets.length, 15); i++) {
				lovedarray.push(loveddatalist.beatmapsets[i].id);
			}
			const allBeatmaps = JSON.parse(fs.readFileSync("./ServerDatas/Beatmaps/Beatmaps.json", "utf-8"));
			const differentlovedarray = findDifferentElements(allBeatmaps.Loved[mode], lovedarray);
			allBeatmaps.Loved[mode] = lovedarray;
			fs.writeFileSync("./ServerDatas/Beatmaps/Beatmaps.json", JSON.stringify(allBeatmaps, null, 4), "utf-8");
			if (differentlovedarray == null) continue;
			for (const differentloved of differentlovedarray) {
				try {
					let lovedBeatmapsMaxSrId;
					let lovedBeatmapsMinSrId;
					await v2.beatmap.set(differentloved).then(async (res) => {
						const array = res.beatmaps;
						array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
						const maxRatingObj = array[array.length - 1];
						const minRatingObj = array[0];
						lovedBeatmapsMaxSrId = maxRatingObj.id;
						lovedBeatmapsMinSrId = minRatingObj.id;
					});
					if (lovedBeatmapsMaxSrId == undefined || lovedBeatmapsMinSrId == undefined) continue;

					const mapMaxInfo = await new osuLibrary.GetMapData(lovedBeatmapsMaxSrId, apikey, modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(lovedBeatmapsMinSrId, apikey, modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(lovedBeatmapsMaxSrId, 0, modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(lovedBeatmapsMinSrId, 0, modeConvertMap(mode));
					const maxsrpp = await maxCalculator.calculateSR();
					const minsrpp = await minCalculator.calculateSR();
					const maxdtpp = await maxCalculator.calculateDT();
					const mindtpp = await minCalculator.calculateDT();
		
					const BPM = `${mapMaxInfo.bpm}BPM (DT ${Math.round(Number(mapMaxInfo.bpm) * 1.5)}BPM)`;
					const maxCombo = mapMaxInfo.max_combo;
					const minCombo = mapMinInfo.max_combo;
					let Objectstring = minCombo == maxCombo ? `${maxCombo}` : `${minCombo} ~ ${maxCombo}`;
					const lengthsec = mapMaxInfo.hit_length;
					const lengthsecDT = Math.round(Number(mapMaxInfo.hit_length) / 1.5);
					const maptime = formatTime(lengthsec);
					const maptimeDT = formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;
		
					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${formatNumber(hours)}時${formatNumber(minutes)}分`;

					let srstring = maxsrpp.sr == minsrpp.sr ? `★${maxsrpp.sr.toFixed(2)} (DT ★${maxdtpp.sr.toFixed(2)})` : `★${minsrpp.sr.toFixed(2)} ~ ${maxsrpp.sr.toFixed(2)} (DT ★${mindtpp.sr.toFixed(2)} ~ ${maxdtpp.sr.toFixed(2)})`;
		
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setAuthor({ name: `💓New Loved ${mode} Map💓` })
						.setTitle(`${mapMaxInfo.artist} - ${mapMaxInfo.title} by ${mapMaxInfo.creator}`)
						.setDescription(`**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapMaxInfo.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapMaxInfo.beatmapset_id})`)
						.setThumbnail(`https://b.ppy.sh/thumb/${mapMaxInfo.beatmapset_id}l.jpg`)
						.setURL(`https://osu.ppy.sh/beatmapsets/${mapMaxInfo.beatmapset_id}`)
						.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
						.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
						.addFields({ name: "`loved 日時`", value: `**${dateString}**`, inline: true });
					for (const element of JSON.parse(fs.readFileSync(`./ServerDatas/MapcheckChannels.json`, "utf-8")).Loved[mode]) {
						if (client.channels.cache?.get(element) == undefined) continue;
						try {
							await client.channels.cache.get(element).send({ embeds: [embed] })
							const membersdata = await client.channels.cache.get(element).guild.members.fetch()
							let mentionstring = [];
							const allUser = JSON.parse(fs.readFileSync(`./ServerDatas/MentionUser.json`, "utf-8"));
							const mentionUser = allUser["Loved"][element]?.[mode];
							if (mentionUser == undefined) continue;
							for (const user of mentionUser) {
								if (membersdata.get(user) == undefined) continue;
								mentionstring.push(`<@${user}>`);
							}
							if (mentionstring.length != 0) {
								await client.channels.cache.get(element).send(`${mentionstring.join(" ")}\n新しい${mode}のLoved譜面が出ました！`);
							}
						} catch {
							continue;
						}
					}
				} catch (e) {
					console.log(e);
					continue;
				}
			}
		}
		resolve();
	})
}

async function rankedintheday() {
	const modeArray = ["osu", "taiko", "catch", "mania"];
	await auth.login(osuclientid, osuclientsecret);
	for (const mode of modeArray) {
		const qfparsedjson = JSON.parse(fs.readFileSync(`./ServerDatas/Beatmaps/${mode}.json`, "utf-8"));
		const now = new Date();
		const sevenDayAgoDate = new Date();
		sevenDayAgoDate.setDate(sevenDayAgoDate.getDate() - 7);
		const sevenDayAgoDateString = `${sevenDayAgoDate.getFullYear()}-${sevenDayAgoDate.getMonth() + 1}-${sevenDayAgoDate.getDate()}`;
		let sevenDayAgoQf = [];
		let count = 0;
		for (const element of qfparsedjson) {
			try {
				const qfdate = new Date(element.qfdate);
				const qfdateString = `${qfdate.getFullYear()}-${qfdate.getMonth() + 1}-${qfdate.getDate()}`;
				if (qfdateString == sevenDayAgoDateString) {
					if (element.rankeddate != "-") continue;
					count++;
					const date = new Date(element.qfdate);
					const year = date.getFullYear();
					const month = date.getMonth() + 1;
					const day = date.getDate();
					const hours = date.getHours();
					const minutes = date.getMinutes();

					let QFBeatmapsMaxSrId;
					let QFBeatmapsMinSrId;
					await v2.beatmap.set(element.id).then(async (res) => {
						const array = res.beatmaps;
						array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
						const maxRatingObj = array[array.length - 1];
						const minRatingObj = array[0];
						QFBeatmapsMaxSrId = maxRatingObj.id;
						QFBeatmapsMinSrId = minRatingObj.id;
					});
					if (QFBeatmapsMaxSrId == undefined || QFBeatmapsMinSrId == undefined) continue;

					const mapInfo = await new osuLibrary.GetMapData(QFBeatmapsMaxSrId, apikey, modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMaxSrId, 0, modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMinSrId, 0, modeConvertMap(mode));
					const maxsrpp = await maxCalculator.calculateSR();
					const minsrpp = await minCalculator.calculateSR();
					const maxdtpp = await maxCalculator.calculateDT();
					const mindtpp = await minCalculator.calculateDT();
					let srstring = maxsrpp.sr == minsrpp.sr ? `★${maxsrpp.sr.toFixed(2)} (DT ★${maxdtpp.sr.toFixed(2)})` : `★${minsrpp.sr.toFixed(2)} ~ ${maxsrpp.sr.toFixed(2)} (DT ★${mindtpp.sr.toFixed(2)} ~ ${maxdtpp.sr.toFixed(2)})`;
					let ppstring = maxsrpp.pp == minsrpp.pp ? `${maxsrpp.pp.toFixed(2)}pp (DT ${maxdtpp.pp.toFixed(2)}pp)` : `${minsrpp.pp.toFixed(2)} ~ ${maxsrpp.pp.toFixed(2)}pp (DT ${mindtpp.pp.toFixed(2)} ~ ${maxdtpp.pp.toFixed(2)}pp)`;
					sevenDayAgoQf.push({ name : `${count}. **${mapInfo.title} - ${mapInfo.artist}**`, value : `▸Mapped by **${mapInfo.creator}**\n▸SR: ${srstring}\n▸PP: ${ppstring}\n▸**Download** | [map](https://osu.ppy.sh/beatmapsets/${element.id}) | [Nerinyan](https://api.nerinyan.moe/d/${element.id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${element.id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${element.id})\n**Qualified**: ${year}年 ${month}月 ${day}日 ${formatNumber(hours)}:${formatNumber(minutes)}\n` });
				}
			} catch (e) {
				console.log(e);
				continue;
			}
		}

		if (sevenDayAgoQf.length == 0) sevenDayAgoQf.push({ name : `**今日Ranked予定の${mode}譜面はありません**`, value : `チェック日時: ${now.getFullYear()}年 ${now.getMonth() + 1}月 ${now.getDate()}日 ${formatNumber(now.getHours())}:${formatNumber(now.getMinutes())}` });

		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉Daily Ranked Check🎉` })
			.setTitle(`日付が変わりました！今日Ranked予定の${mode}マップのリストです！`)
			.addFields(sevenDayAgoQf)
			.setFooter({ text: `このメッセージは毎日0時に送信されます。既にRankedされた譜面は表示されません。` });
		for (const element of JSON.parse(fs.readFileSync(`./ServerDatas/MapcheckChannels.json`, "utf-8")).Qualified[mode]) {
			try {
				if (client.channels.cache?.get(element) == undefined) continue;
				await client.channels.cache.get(element).send({ embeds: [embed] });
			} catch {
				continue;
			}
		}
	}
}

/**
 * Formats a number by adding a leading zero if it is less than 10.
 * @param {number} num - The number to be formatted.
 * @returns {string} The formatted number.
 */
function formatNumber(num) {
    return num < 10 ? '0' + num : num.toString();
}

async function checkMap() {
	await checkqualified();
	await checkranked();
	await checkloved();
}

function modeConvertMap(str) {
	switch (str) {
		case "osu":
			return 0;
		case "taiko":
			return 1;
		case "catch":
			return 2;
		case "mania":
			return 3;
	}
}

function modeConvertAcc(num) {
	switch (Number(num)) {
		case 0:
			return "osu";
		case 1:
			return "taiko";
		case 2:
			return "fruits";
		case 3:
			return "mania";
	}
}

/**
 * Creates a progress bar based on the given percentage.
 * @param {number} percent - The percentage value (0-100) to represent the progress.
 * @returns {string} The progress bar string.
 */
function createProgressBar(percent) {
	const progress = parseInt((20 * percent / 100).toFixed(0));
	const emptyProgress = parseInt((20 * (100 - percent) / 100).toFixed(0));
	const progressText = "#".repeat(progress);
	const emptyProgressText = "-".repeat(emptyProgress);
	return `[${progressText}${emptyProgressText}]`;
}

async function makeBackup() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const day = now.getDate();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const dateString = `${year}-${month}-${day} ${hours} ${minutes}`;
	await fs.mkdir(`./Backups/${dateString}`);
	await fs.copy("./ServerDatas", `./Backups/${dateString}`);
}

/**
 * Calculates the match percentage between two strings.
 *
 * @param {string} current - The current string.
 * @param {string} total - The total string.
 * @returns {number} The match percentage between the two strings.
 */
function matchPercentage(current, total) {
	let data = [current.split('').map((_, index) => current.slice(0, index + 1))];
	for (let i = 0; i < current.length; i++) {
		data.push(current.slice(i));
	}
	data = data.flat().filter((x, i, self) => self.indexOf(x) === i);
	let matchPercentage = 0;
	for (const element of data) {
		const matchdata = total.replace(element, "");
		if ((total.length - matchdata.length) / total.length * 100 >= matchPercentage) {
			matchPercentage = (total.length - matchdata.length) / total.length * 100;
		}
	}
	return matchPercentage;
}

client.login(token);
