//必要となるライブラリ
const { Client, EmbedBuilder, Events, GatewayIntentBits, ActivityType, WebhookClient } = require("./node_modules/discord.js");
require("./node_modules/dotenv").config();
const fs = require("./node_modules/fs-extra");
const { tools, auth, v2 } = require("./node_modules/osu-api-extended");
const axios = require("./node_modules/axios");
const { Beatmap, Calculator } = require("./node_modules/rosu-pp-nodev");
const { Readable } = require("node:stream");
const path = require("node:path");
const asciify = require("node:util").promisify(require("./node_modules/asciify"));
const osuLibrary = require("./src/osuLibrary.js");
const Utils = require("./src/Utils.js");

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
		GatewayIntentBits.GuildMembers,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent
	]
});

client.on(Events.ClientReady, async () =>
	{
		await asciify("Hoshino Bot", { font: "larry3d" })
			.then(msg => console.log(msg))
			.catch(err => console.log(err));
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
			let webHookData = fs.readJsonSync("./ServerDatas/WebHookData.json");
			if (webHookData.lastDate == new Date().getDate()) return;
			const webHookClient = new WebhookClient({ url: process.env.WEBHOOKURL });
			let timeUntilNextExecution = 0;
			const currentTime = new Date();
			if (currentTime.getHours() >= 6 && currentTime.getHours() <= 18) {
				const sixPM = new Date(currentTime);
				sixPM.setHours(18, 0, 0, 0);
				const timeDiff = sixPM - currentTime;
				const randomTime = currentTime.getTime() + Math.random() * timeDiff;
				const nextExecutionTime = new Date(randomTime);
				console.log(`[${currentTime.toLocaleString()}] WebHook送信予定時刻: ${nextExecutionTime.toLocaleString()}`);
				timeUntilNextExecution = nextExecutionTime - currentTime;
			} else if (currentTime.getHours() <= 18) {
				const sixAM = new Date(currentTime);
				sixAM.setHours(6, 0, 0, 0);
				const sixPM = new Date(currentTime);
				sixPM.setHours(18, 0, 0, 0);
				const timeDiff = sixPM - sixAM;
				const randomTime = sixAM.getTime() + Math.random() * timeDiff;
				const nextExecutionTime = new Date(randomTime);
				console.log(`[${currentTime.toLocaleString()}] WebHook送信予定時刻: ${nextExecutionTime.toLocaleString()}`);
				timeUntilNextExecution = nextExecutionTime - currentTime;
			} else {
				return;
			}
			
			setTimeout(async () => {
				if (webHookData.lastDate == new Date().getDate()) return;
				await webHookClient.send({
					content: "daily bread"
				})
					.then(() => {
						let now = new Date();
						console.log(`[${now.toLocaleString()}] WebHookの送信に成功しました。`);
						webHookData.lastDate = now.getDate();
						fs.writeJsonSync("./ServerDatas/WebHookData.json", webHookData, { spaces: 4, replacer: null });
						webHookData = null;
						now = null;
					})
					.catch(() => {
						let now = new Date();
						console.log(`[${now.toLocaleString()}] WebHookの送信に失敗しました。`);
						webHookData = null;
						now = null;
					});
			}, timeUntilNextExecution);
		})();
	}
);

client.on(Events.InteractionCreate, async (interaction) =>
	{
		try {
			if (!interaction.isCommand()) return;
			commandLogs(interaction, interaction.commandName, 0);
			if (interaction.commandName == "slot") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				let betAmount = interaction.options.get("betamount").value;
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

				const result = Utils.generateSlotResult();
				const rewardMultiplier = Utils.evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier;
				const resultprefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(" ")}\n報酬: ${Utils.formatBigInt(reward)}coin (${resultprefix}${Utils.formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeJsonSync("./ServerDatas/UserBankData.json", bankData, { spaces: 4, replacer: null });
				bankData = null;
				return;
			}

			if (interaction.commandName == "safeslot") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				let betAmount = interaction.options.get("betamount").value;
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

				const result = Utils.generateSlotResult();
				const rewardMultiplier = Utils.evaluateSlotResult(result);
				const reward = rewardMultiplier == 0n ? betAmount * 2n * 10n / 100n : betAmount * rewardMultiplier * 7n * 10n / 100n;
				const resultPrefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(" ")}\n報酬: ${Utils.formatBigInt(reward)}coin (${resultPrefix}${Utils.formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeJsonSync("./ServerDatas/UserBankData.json", bankData, { spaces: 4, replacer: null });
				bankData = null;
				return;
			}

			if (interaction.commandName == "bankranking") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
				let bankDataArray = [];
				for (const key in bankData) {
					bankDataArray.push(bankData[key]);
				}
				bankDataArray.sort((a, b) => b.balance.length - a.balance.length);
				let ranking = [];
				for (let i = 0; i < Math.min(bankDataArray.length, 10); i++) {
					ranking.push(`- __#**${i + 1}**__: **${bankDataArray[i].username}** (__*${bankDataArray[i].balance.length}桁*__)`);
				}
				await interaction.reply(`__**Current Bank digits Ranking**__\n${ranking.join("\n")}`);
				bankData = null;
				return;
			}

			if (interaction.commandName == "lv") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
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
				await interaction.reply(`あなたの現在のレベルは **__${currentrank}lv__** / 300 (次のレベル => **${Utils.formatBigInt(nextbalance)}**coins)`);
				bankData = null;
				return;
			}

			if (interaction.commandName == "recoshot") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
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
				const result = Utils.generateSlotResult();
				const rewardMultiplier = Utils.evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier * 8n * 10n / 100n;
				const resultprefix = reward - betAmount >= 0n ? "+" : "";
				await interaction.reply(`結果: ${result.join(" ")}\n報酬: ${Utils.formatBigInt(reward)}coin (${resultprefix}${Utils.formatBigInt((reward - betAmount))})`);
				bankData[interaction.user.id].balance = (newBalance + reward).toString();
				fs.writeJsonSync("./ServerDatas/UserBankData.json", bankData, { spaces: 4, replacer: null });
				bankData = null;
				return;
			}

			if (interaction.commandName == "reco") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
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
				bankData = null;
				return;
			}

			if (interaction.commandName == "bank") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
				if (!bankData[interaction.user.id]) {
					await interaction.reply("このカジノにユーザー登録されていないようです。/regcasinoで登録してください。");
					return;
				}

				const currentbank = bankData[interaction.user.id].balance;
				await interaction.reply(`${interaction.user.username}の現在の銀行口座残高: \n ${Utils.formatBigInt(currentbank)} (${Utils.toJPUnit(currentbank)}) coins`);
				bankData = null;
				return;
			}

			if (interaction.commandName == "amount") {
				const amount = interaction.options.get("amount").value;
				if (!(/^\d+$/.test(amount))) {
					await interaction.reply("数字のみ入力するようにしてください。");
					return;
				}
				await interaction.reply(Utils.toJPUnit(amount));
				return;
			}

			if (interaction.commandName == "regcasino") {
				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
				if (bankData[interaction.user.id]) {
					await interaction.reply("あなたはもう既にこのカジノに登録されています。");
					return;
				}

				bankData[interaction.user.id] = {
					username: interaction.user.username,
					balance: "1000000"
				};

				fs.writeJsonSync("./ServerDatas/UserBankData.json", bankData, { spaces: 4, replacer: null });
				await interaction.reply(`カジノへようこそ ${interaction.user.username}! 初回なので1000000コインを差し上げます。`);
				bankData = null;
				return;
			}

			if (interaction.commandName == "send") {
				const sentusername = interaction.options.get("username").value;
				if (sentusername == interaction.user.username) {
					await interaction.reply("自分自身に送ることは許されていません！");
					return;
				}

				let bankData = fs.readJsonSync("./ServerDatas/UserBankData.json");
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

				const amount = interaction.options.get("amount").value;
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

				fs.writeJsonSync("./ServerDatas/UserBankData.json", bankData, { spaces: 4, replacer: null });
				await interaction.reply("送金が完了しました。");
				bankData = null;
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
				let dataBase = fs.readJsonSync("./Pictures/Furry/DataBase.json");
				if (dataBase.FileCount == 0) {
					await interaction.reply("ファイルが存在しません。");
					return;
				}

				const random = Math.floor(Math.random() * dataBase.FileCount);
				const file = dataBase.PhotoDataBase[random];
				const picData = fs.readFileSync(path.join("./Pictures/Furry", file));
				await interaction.reply({ files: [{ attachment: picData, name: file }] });
				dataBase = null;
				return;
			}

			if (interaction.commandName == "kemodelete") {
				let dataBase = fs.readJsonSync("./Pictures/Furry/DataBase.json");
				const usercount = interaction.options.get("count").value;
				let foundFlag = false;
				for (const fileName of dataBase.PhotoDataBase) {
					const file = fileName.split(".")[0];
					if (file == usercount) {
						foundFlag = true;
						fs.removeSync(`./Pictures/Furry/${fileName}`);
						dataBase.PhotoDataBase = dataBase.PhotoDataBase.filter(item => item !== fileName);
						dataBase.FileCount--;
						fs.writeJsonSync("./Pictures/Furry/DataBase.json", dataBase, { spaces: 4, replacer: null });
						await interaction.reply("ファイルが正常に削除されました。");
						break;
					}
				}
				if (!foundFlag) {
					await interaction.reply("そのファイルは存在しません。");
					dataBase = null;
					return;
				}
				dataBase = null;
				return;
			}

			if (interaction.commandName == "kemocount") {
				let dataBase = fs.readJsonSync("./Pictures/Furry/DataBase.json");
				const count = dataBase.FileCount;
				await interaction.reply(`今まで追加した画像や映像、gifの合計枚数は${count}枚です。`);
				dataBase = null;
				return;
			}

			if (interaction.commandName == "pic") {
				const tag = interaction.options.get("tag").value;
				if (!fs.existsSync(path.join("./Pictures/tag", tag, "DataBase.json"))) {
					await interaction.reply("このタグは存在しません。");
					return;
				}
				let dataBase = fs.readJsonSync(path.join("./Pictures/tag", tag, "DataBase.json"));
				const filecount = dataBase.FileCount;
				if (filecount == 0) {
					await interaction.reply("ファイルが存在しません。");
					return;
				};
				const random = Math.floor(Math.random() * filecount);
				const file = dataBase.PhotoDataBase[random];
				let picData = fs.readFileSync(path.join("./Pictures/tag", tag, file));
				await interaction.reply({ files: [{ attachment: picData, name: file }] });
				dataBase = null;
				picData = null;
				return;
			}

			if (interaction.commandName == "settag") {
				const tagName = interaction.options.get("name").value;
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
					let dataBase = fs.readJsonSync(`./Pictures/tag/${folder}/DataBase.json`);
					if (dataBase.id == interaction.channel.id) {
						fs.renameSync(`./Pictures/tag/${folder}`, `./Pictures/tag/${tagName}`);
						await interaction.reply("このチャンネルのタグ名を更新しました。");
						dataBase = null;
						return;
					}
					dataBase = null;
				}
				fs.mkdirSync(`./Pictures/tag/${tagName}`);
				fs.writeJsonSync(`./Pictures/tag/${tagName}/DataBase.json`, {
					id: interaction.channel.id,
					FileCount: 0,
					PhotoDataBase: []
				}, { spaces: 4, replacer: null });
				await interaction.reply("タグが正常に作成されました。");
				return;
			}

			if (interaction.commandName == "deltag") {
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					let dataBase = fs.readJsonSync(`./Pictures/tag/${folder}/DataBase.json`);
					if (dataBase.id == interaction.channel.id) {
						fs.removeSync(`./Pictures/tag/${folder}/DataBase.json`);
						await interaction.reply("タグの削除が正常に完了しました。");
						dataBase = null;
						return;
					}
					dataBase = null;
				}
				await interaction.reply("このチャンネルのタグは存在しません。");
				return;
			}

			if (interaction.commandName == "delpic") {
				const usercount = interaction.options.get("count").value;
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					let dataBase = fs.readJsonSync(`./Pictures/tag/${folder}/DataBase.json`);
					if (dataBase.id == interaction.channel.id) {
						for (const fileName of dataBase.PhotoDataBase) {
							const file = fileName.split(".")[0];
							if (file == usercount) {
								fs.removeSync(`./Pictures/tag/${folder}/${fileName}`);
								dataBase.PhotoDataBase = dataBase.PhotoDataBase.filter(item => item !== fileName);
								dataBase.FileCount--;
								fs.writeJsonSync(`./Pictures/tag/${folder}/DataBase.json`, dataBase, { spaces: 4, replacer: null });
								await interaction.reply("ファイルが正常に削除されました。");
								dataBase = null;
								return;
							}
						}
						await interaction.reply("そのファイルは存在しません。");
						dataBase = null;
						return;
					}
					dataBase = null;
				}
				await interaction.reply("このチャンネルのタグは存在しません。");
				return;
			}

			if (interaction.commandName == "piccount") {
				const tagName = interaction.options.get("name").value;
				if (!fs.existsSync(`./Pictures/tag/${tagName}/DataBase.json`)) {
					await interaction.reply("このタグは登録されていません。");
					return;
				}
				let dataBase = fs.readJsonSync(`./Pictures/tag/${tagName}/DataBase.json`);
				const filecount = dataBase.FileCount;
				await interaction.reply(`今まで${tagName}タグに追加した画像や映像、gifの合計枚数は${filecount}枚です。`);
				dataBase = null;
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
				const tag = interaction.options.get("name").value;
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
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
				allQuotes = null;
				return;
			}

			if (interaction.commandName == "setquotetag") {
				const tagName = interaction.options.get("name").value;
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				if (allQuotes[tagName]) {
					await interaction.reply("このタグ名は既に存在しています。");
					return;
				}
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						allQuotes[tagName] = allQuotes[key];
						delete allQuotes[key];
						await interaction.reply("このチャンネルのタグ名を更新しました。");
						fs.writeJsonSync("./ServerDatas/Quotes.json", allQuotes, { spaces: 4, replacer: null });
						return;
					}
				}
				allQuotes[tagName] = {
					"id": interaction.channel.id,
					"quotes": []
				};
				fs.writeJsonSync("./ServerDatas/Quotes.json", allQuotes, { spaces: 4, replacer: null });
				await interaction.reply("タグが正常に作成されました。");
				allQuotes = null;
				return;
			}

			if (interaction.commandName == "delquotetag") {
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						delete allQuotes[key];
						fs.writeJsonSync("./ServerDatas/Quotes.json", allQuotes, { spaces: 4, replacer: null });
						await interaction.reply("タグが正常に削除されました。");
						return;
					}
				}
				await interaction.reply("このチャンネルにタグは存在しません。");
				allQuotes = null;
				return;
			}

			if (interaction.commandName == "delquote") {
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				for (const key in allQuotes) {
					if (allQuotes[key].id == interaction.channel.id) {
						const wannadelete = interaction.options.get("quote").value;
						if (!allQuotes[key].quotes.includes(wannadelete)) {
							await interaction.reply("その名言は存在しません。");
							return;
						}
						allQuotes[key].quotes = allQuotes[key].quotes.filter(item => item !== wannadelete );
						fs.writeJsonSync("./ServerDatas/Quotes.json", allQuotes, { spaces: 4, replacer: null });
						await interaction.reply("名言の削除が完了しました。");
						return;
					}
				}
				await interaction.reply("このチャンネルにはタグが存在しません。");
				allQuotes = null;
				return;
			}

			if (interaction.commandName == "quotecount") {
				const tagName = interaction.options.get("name").value;
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				if (!allQuotes[tagName]) {
					await interaction.reply("このタグは存在しません。");
					return;
				}
				if (allQuotes[tagName].quotes.length == 0) {
					await interaction.reply("このタグには名言がないみたいです。");
					return;
				}
				await interaction.reply(`今まで${interaction.channel.name}タグに追加した名言の合計枚数は${allQuotes[interaction.channel.name].quotes.length}個です。`);
				allQuotes = null;
				return;
			}

			if (interaction.commandName == "allquotetags") {
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				let taglist = [];
				let i = 0;
				for (const key in allQuotes) {
					taglist.push(`${i + 1}: ${key}\n`);
					i++;
				}
				allQuotes = null;
				if (taglist.length == 0) {
					await interaction.reply("まだ１つもタグが存在しません。");
					return;
				}
				await interaction.reply(`現在登録されているタグは以下の通りです。\n${taglist.join("")}`);
				return;
			}

			if (interaction.commandName == "link") {
				const channelid = interaction.channel.id;
				let allchannels = fs.readJsonSync("./ServerDatas/BeatmapLinkChannels.json");
				if (allchannels.Channels.includes(channelid)) {
					await interaction.reply("このチャンネルでは既にマップ情報が表示されるようになっています。");
					return;
				}
				allchannels.Channels.push(channelid);
				fs.writeJsonSync("./ServerDatas/BeatmapLinkChannels.json", allchannels, { spaces: 4, replacer: null });
				await interaction.reply(`このチャンネルにマップリンクが送信されたら自動的にマップ情報が表示されるようになりました。解除したい場合は/unlinkコマンドを使用してください。`);
				allchannels = null;
				return;
			}

			if (interaction.commandName == "unlink") {
				const channelid = interaction.channel.id;
				let allchannels = fs.readJsonSync("./ServerDatas/BeatmapLinkChannels.json");
				if (!allchannels.Channels.includes(channelid)) {
					await interaction.reply("このチャンネルでは既にマップ情報が表示されないようになっています。");
					allchannels = null;
					return;
				}
				allchannels.Channels = allchannels.Channels.filter(item => item !== channelid);
				fs.writeJsonSync("./ServerDatas/BeatmapLinkChannels.json", allchannels, { spaces: 4, replacer: null });
				await interaction.reply(`このチャンネルにマップリンクが送信されてもマップ情報が表示されないようになりました。再度表示したい場合は/linkコマンドを使用してください。`);
				allchannels = null;
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
						const bpmMin = Utils.isNaNwithNumber(Math.min(...data.BPMarray));
						const bpmMax = Utils.isNaNwithNumber(Math.max(...data.BPMarray));
						const bpmStr = bpmMin == bpmMax ? bpmMax.toFixed(1) : `${bpmMin.toFixed(1)} ~ ${bpmMax.toFixed(1)}`;
						const hitTotal = data["1/3 times"] + data["1/4 times"] + data["1/6 times"] + data["1/8 times"];
						const streamTotal = data.streamCount + data.techStreamCount;
						const hitPercentData = [Utils.isNaNwithNumber(Math.round(data["1/3 times"] / hitTotal * 100)), Utils.isNaNwithNumber(Math.round(data["1/4 times"] / hitTotal * 100)), Utils.isNaNwithNumber(Math.round(data["1/6 times"] / hitTotal * 100)), Utils.isNaNwithNumber(Math.round(data["1/8 times"] / hitTotal * 100))] ;
						const streamPercentData = [Utils.isNaNwithNumber(Math.round(data.streamCount / streamTotal * 100)), Utils.isNaNwithNumber(Math.round(data.techStreamCount / streamTotal * 100))];
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
					},  Utils.modeConvertAcc(mode));

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
					rankingdata.push({ name: `\`#${i + 1}\``, value: `**Rank**: ${Utils.rankconverter(resulttop5[i].rank)}　Player: **${resulttop5[i].username}**　Score: **${Number(resulttop5[i].score).toLocaleString()}** \n Combo: **${resulttop5[i].maxcombo}**　**Acc**: **${acc}**%　PP: **${pp.toFixed(2)}**pp　Miss:${resulttop5[i].countmiss}`, inline: false });
				}
				embed.addFields(rankingdata);
				await interaction.channel.send({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "qf" || interaction.commandName == "deqf" || interaction.commandName == "loved" || interaction.commandName == "deloved") {
				const mode = interaction.options.get("mode").value;
				const channelid = interaction.channel.id;
				let allchannels = fs.readJsonSync(`./ServerDatas/MapcheckChannels.json`);
				switch (interaction.commandName) {
					case "qf": {
						if (allchannels["Qualified"][mode].includes(channelid)) {
							await interaction.reply("このチャンネルは既にQualified、Rankedチェックチャンネルとして登録されています。");
							allchannels = null;
							return;
						}
						allchannels["Qualified"][mode].push(channelid);
						fs.writeJsonSync(`./ServerDatas/MapcheckChannels.json`, allchannels, { spaces: 4, replacer: null });
						await interaction.reply(`このチャンネルを${mode}のQualified、Rankedチェックチャンネルとして登録しました。`);
						allchannels = null;
						return;
					}

					case "deqf": {
						if (allchannels["Qualified"][mode].includes(channelid)) {
							const newchannels = allchannels["Qualified"][mode].filter(item => item !== channelid);
							fs.writeJsonSync(`./ServerDatas/MapcheckChannels.json`, newchannels, { spaces: 4, replacer: null });
							await interaction.reply(`このチャンネルを${mode}のQualified、Rankedチェックチャンネルから削除しました。`);
						} else {
							await interaction.reply("このチャンネルはQualified、Rankedチェックチャンネルとして登録されていません。");
						}
						allchannels = null;
						return;
					}

					case "loved": {
						if (allchannels["Loved"][mode].includes(channelid)) {
							await interaction.reply("このチャンネルは既にLovedチェックチャンネルとして登録されています。");
							allchannels = null;
							return;
						}
						allchannels["Loved"][mode].push(channelid);
						fs.writeJsonSync(`./ServerDatas/MapcheckChannels.json`, allchannels, { spaces: 4, replacer: null });
						await interaction.reply(`このチャンネルを${mode}のLovedチェックチャンネルとして登録しました。`);
						allchannels = null;
						return;
					}

					case "deloved": {
						if (allchannels["Loved"][mode].includes(channelid)) {
							const newchannels = allchannels["Loved"][mode].filter(item => item !== channelid);
							fs.writeJsonSync(`./ServerDatas/MapcheckChannels.json`, newchannels, { spaces: 4, replacer: null });
							await interaction.reply(`このチャンネルを${mode}のLovedチェックチャンネルから削除しました。`);
						} else {
							await interaction.reply("このチャンネルはLovedチェックチャンネルとして登録されていません。");
						}
						allchannels = null;
						return;
					}
				}
			}

			if (interaction.commandName == "qfmention" || interaction.commandName == "lovedmention" || interaction.commandName == "rankedmention" || interaction.commandName == "deqfmention" || interaction.commandName == "derankedmention" || interaction.commandName == "delovedmention") {
				const mode = interaction.options.get("mode").value;
				const userid = interaction.user.id;
				const serverid = interaction.guild.id;
				let alluser = fs.readJsonSync(`./ServerDatas/MentionUser.json`);
				switch (interaction.commandName) {
					case "qfmention": {
						if (alluser["Qualified"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にQualifiedチェックチャンネルのメンションを受け取るようになっています。");
							alluser = null;
							return;
						}
						if (!alluser["Qualified"][serverid]) alluser["Qualified"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Qualified"][serverid][mode].push(userid);
						fs.writeJsonSync(`./ServerDatas/MentionUser.json`, alluser, { spaces: 4, replacer: null });
						await interaction.reply(`今度から${mode}でQualifiedが検出されたらメンションが飛ぶようになりました.`);
						alluser = null;
						return;
					}

					case "lovedmention": {
						if (alluser["Loved"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にLovedチェックチャンネルのメンションを受け取るようになっています。");
							alluser = null;
							return;
						}
						if (!alluser["Loved"][serverid]) alluser["Loved"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Loved"][serverid][mode].push(userid);
						fs.writeJsonSync(`./ServerDatas/MentionUser.json`, alluser, { spaces: 4, replacer: null });
						await interaction.reply(`今度から${mode}でlovedが検出されたらメンションが飛ぶようになりました。`);
						alluser = null;
						return;
					}

					case "rankedmention": {
						if (alluser["Ranked"][serverid]?.[mode].includes(userid)) {
							await interaction.reply("あなたは既にRankedチェックチャンネルのメンションを受け取るようになっています。");
							alluser = null;
							return;
						}
						if (!alluser["Ranked"][serverid]) alluser["Ranked"][serverid] = {
							"osu": [],
							"taiko": [],
							"catch": [],
							"mania": []
						};
						alluser["Ranked"][serverid][mode].push(userid);
						fs.writeJsonSync(`./ServerDatas/MentionUser.json`, alluser, { spaces: 4, replacer: null });
						await interaction.reply(`今度から${mode}でRankedが検出されたらメンションが飛ぶようになりました。`);
						alluser = null;
						return;
					}

					case "deqfmention": {
						if (alluser["Qualified"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Qualified"][serverid][mode].filter(item => item !== userid);
							fs.writeJsonSync(`./ServerDatas/MentionUser.json`, newuser, { spaces: 4, replacer: null });
							await interaction.reply(`今度から${mode}でQualified検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にQualifiedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						alluser = null;
						return;
					}

					case "derankedmention": {
						if (alluser["Ranked"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Ranked"][serverid][mode].filter(item => item !== userid);
							fs.writeJsonSync(`./ServerDatas/MentionUser.json`, newuser, { spaces: 4, replacer: null });
							await interaction.reply(`今度から${mode}でRanked検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にRankedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						alluser = null;
						return;
					}

					case "delovedmention": {
						if (alluser["Loved"][serverid]?.[mode].includes(userid)) {
							const newuser = alluser["Loved"][serverid][mode].filter(item => item !== userid);
							fs.writeJsonSync(`./ServerDatas/MentionUser.json`, newuser, { spaces: 4, replacer: null });
							await interaction.reply(`今度から${mode}でLoved検出されても、メンションが飛ばないようになりました。`);
						} else {
							await interaction.reply("あなたは既にLovedチェックチャンネルのメンションを受け取るようになっていません。");
						}
						alluser = null;
						return;
					}
				}
			}

			if (interaction.commandName == "bg") {
				const maplink = interaction.options.get("beatmaplink").value;
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				const regex4 = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+$/;
				let BeatmapsetId
				switch (true) {
					case regex.test(maplink): {
						BeatmapsetId = maplink.split("/")[4].split("#")[0];
						break;
					}
					case regex3.test(maplink) || regex2.test(maplink): {
						const mapInfo = await new osuLibrary.GetMapData(maplink, apikey).getDataWithoutMode();
						BeatmapsetId = mapInfo.beatmapset_id;
						break;
					}
					case regex4.test(maplink): {
						BeatmapsetId = maplink.split("/")[maplink.split("/").length - 1];
						break;
					}
					default: {
						await interaction.reply(`ビートマップリンクの形式が間違っています。`);
						return;
					}
				}
				await interaction.reply(`https://assets.ppy.sh/beatmaps/${BeatmapsetId}/covers/raw.jpg`);
				return;
			}

			if (interaction.commandName == "ifmod") {
				let playername = interaction.options.get("username")?.value;
				if (playername == undefined) {
					let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
					const username = allUser["Bancho"][interaction.user.id]?.name;
					if (username == undefined) {
						await interaction.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						allUser = null;
						return;
					}
					playername = username;
					allUser = null;
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
				}, Utils.modeConvertAcc(mode));

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
				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				await interaction.reply("GlobalPPの計算中です...");
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
				const globalPPDiff = globalPP - Number(playersInfo.pp_raw);
				const globalPPDiffPrefix = globalPPDiff > 0 ? "+" : "";
				
				const playerUserURL = osuLibrary.URLBuilder.userURL(playersInfo?.user_id);
				const mapperUserURL = osuLibrary.URLBuilder.userURL(mappersInfo?.user_id);
				const mapperIconURL = osuLibrary.URLBuilder.iconURL(mappersInfo?.user_id);
				const backgroundURL = osuLibrary.URLBuilder.backgroundURL(maplink);

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapInfo.artist} - ${mapInfo.title} [${mapInfo.version}]`)
					.setDescription(`Played by [${playersInfo.username}](${playerUserURL})`)
					.addFields({ name: `Mods: ${modsBefore.str} → ${mods.str} Acc: ${acc}% Miss: ${playersScore.countmiss}`, value: `**PP:** **${PPbefore.toFixed(2)}**/${SSPPbefore.pp.toFixed(2)}pp → **${PPafter.toFixed(2)}**/${SSPPafter.pp.toFixed(2)}pp`, inline: true })
					.addFields({ name: `Rank`, value: `**${Number(playersInfo.pp_raw).toLocaleString()}**pp (#${Number(playersInfo.pp_rank).toLocaleString()}) → **${(Math.round(globalPP * 10) / 10).toLocaleString()}**pp ${globalPPDiffPrefix + (globalPPDiff).toFixed(1)}`, inline: false })
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
					await interaction.channel.send({ files: [{ attachment: res, name: "SRchart.png" }] });
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
					.setDescription(`Combo: \`${mapInfo.max_combo}x\` Stars: \`${sr.sr.toFixed(2)}★\` \n Length: \`${Utils.formatTime(Number(mapInfo.total_length))} (${Utils.formatTime(Number(mapInfo.hit_length))})\` BPM: \`${mapInfo.bpm}\` Objects: \`${objectCount}\` \n CS: \`${mapInfo.diff_size}\` AR: \`${mapInfo.diff_approach}\` OD: \`${mapInfo.diff_overall}\` HP: \`${mapInfo.diff_drain}\` Spinners: \`${mapInfo.count_spinner}\``)
					.setURL(mapUrl)
					.setAuthor({ name: `Mapped by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.addFields({ name: "Preview link", value: `[Preview this map!](${previewlink})`, inline: true })
					.setImage(backgroundURL);
				await interaction.reply({ embeds: [embed] });
				return;
			}

			if (interaction.commandName == "calculatepp") {
				let mode = interaction.options.get("mode").value;
				const osufile = interaction.options.get("beatmapfile").attachment.attachment;

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

				let mod = new osuLibrary.Mod(interaction.options.get("mods")?.value).get();

				if (!mod) {
					await interaction.reply("Modが存在しないか、指定できないModです。");
					return;
				}

				const beatmapdata = await axios.get(osufile, { responseType: "arraybuffer" })
					.then(res => res.data);

				await interaction.reply("計算中です。");
				const map = new Beatmap({ bytes: new Uint8Array(Buffer.from(beatmapdata)) });
				const beatmapDataStream = Readable.from(Buffer.from(beatmapdata));
				const lineReader = require("readline").createInterface({ input: beatmapDataStream });
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

				lineReader.on("line", (line) => {
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
						Mapinfo.TotalLength = Utils.formatTime(totalSeconds);
					}

					if (line.startsWith("[")) return;
					const key = line.split(":")[0];
					const value = line.split(":")?.slice(1)?.join(":");

					if (key === "Mode") Mapinfo.Mode = Number(value);
					if (key === "Artist") Mapinfo.Artist = value;
					if (key === "Title") Mapinfo.Title = value;
					if (key === "Creator") Mapinfo.Creator = value;
					if (key === "Version") Mapinfo.Version = value;
					if (key === "HPDrainRate") Mapinfo.HPDrainRate = Number(value);
					if (key === "CircleSize") Mapinfo.CircleSize = Number(value);
					if (key === "OverallDifficulty") Mapinfo.OverallDifficulty = Number(value);
					if (key === "ApproachRate") Mapinfo.ApproachRate = Number(value);
				});

				lineReader.on("close", async () => {
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

			if (interaction.commandName == "osubgquiz" || interaction.commandName == "osubgquizpf") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get("username").value;
				let mode = interaction.options.get("mode").value;

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
				const ifPerferct = interaction.commandName == "osubgquizpf";
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "BG", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": ifPerferct, "Answerer": "", "hint": false});
				}
				fs.writeJsonSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, randomjson, { spaces: 4, replacer: null });
				let jsondata = fs.readJsonSync(`./OsuPreviewquiz/${interaction.channel.id}.json`);
				await interaction.channel.send(`問題1のBGを表示します。`);
				await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: "arraybuffer" })
					.then(async res => {
						let BGdata = res.data;
						await interaction.channel.send({ files: [{ attachment: BGdata, name: "background.jpg" }] });
						BGdata = null;
					});
				jsondata = null;
				return;
			}

			if (interaction.commandName == "osuquiz" || interaction.commandName == "osuquizpf") {
				if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("既にクイズが開始されています。/quizendで終了するか回答してください。");
					return;
				}

				const username = interaction.options.get("username").value;
				let mode = interaction.options.get("mode").value;

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
				const ifPerferct = interaction.commandName == "osuquizpf";
				for (let i = 0; i < randommap.length; i++) {
					randomjson.push({"mode": "pre", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": ifPerferct, "Answerer": "", "hint": false});
				}
				fs.writeJsonSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, randomjson, { spaces: 4, replacer: null });
				let jsondata = fs.readJsonSync(`./OsuPreviewquiz/${interaction.channel.id}.json`);
				await interaction.channel.send(`問題1のプレビューを再生します。`);
				await axios.get(`https://b.ppy.sh/preview/${jsondata[0].id}.mp3`, { responseType: "arraybuffer" })
					.then(async res => {
						let audioData = res.data;
						await interaction.channel.send({ files: [{ attachment: audioData, name: "audio.mp3" }] });
						audioData = null;
					});
				jsondata = null;
				return;
			}

			if (interaction.commandName == "quizend") {
				if (!fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
					await interaction.reply("クイズが開始されていません。");
					return;
				}
				let answererarray = fs.readJsonSync(`./OsuPreviewquiz/${interaction.channel.id}.json`);
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
				fs.removeSync(`./OsuPreviewquiz/${interaction.channel.id}.json`);
				answererarray = null;
				return;
			}

			if (interaction.commandName == "osusearch") {
				await interaction.reply("検索中です...");
				await auth.login(osuclientid, osuclientsecret);
				const seracheddata = await v2.beatmap.search({
					query: interaction.options.get("query").value,
					mode: interaction.options.get("mode").value
				});
				let data = [];
				if (seracheddata.beatmapsets.length == 0) {
					await interaction.channel.send("検索結果が見つかりませんでした。");
					return;
				}
				let embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`検索結果: ${interaction.options.get("query").value}`)
					.setImage(`https://assets.ppy.sh/beatmaps/${seracheddata.beatmapsets[0].beatmaps[0].beatmapset_id}/covers/cover.jpg`)
					.setTimestamp();
				
				for (let i = 0; i < Math.min(seracheddata.beatmapsets.length, 5); i++) {
					let array = seracheddata.beatmapsets[i].beatmaps;
					array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
					const maxRatingObj = array[array.length - 1];
					const minRatingObj = array[0];
					let maxsrobj = maxRatingObj.id;
					let minsrobj = minRatingObj.id;
					const maxsrdata = new osuLibrary.CalculatePPSR(maxsrobj, 0, Utils.modeConvertMap(interaction.options.get("mode")));
					const minsrdata = new osuLibrary.CalculatePPSR(minsrobj, 0, Utils.modeConvertMap(interaction.options.get("mode")));
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
				const osuid = interaction.options.get("username").value;
				const userData = await new osuLibrary.GetUserData(osuid, apikey).getDataWithoutMode();
				if (!userData) {
					await interaction.reply("ユーザーが見つかりませんでした。");
					return;
				}
				let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
				if (!allUser["Bancho"][username]) {
					allUser["Bancho"][username] = {
						"name": osuid
					};
				} else {
					allUser["Bancho"][username].name = osuid;
				}
				fs.writeJsonSync("./ServerDatas/PlayerData.json", allUser, { spaces: 4, replacer: null });
				await interaction.reply(`${interaction.user.displayName}さんは${osuid}として保存されました!`);
				allUser = null;
				return;
			}

			if (interaction.commandName == "slayer") {
				const username = interaction.options.get("username").value;
				const slayerid = interaction.options.get("slayername").value;
				const i = interaction.options.get("profileid").value;

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
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv8**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 1000000 * 100)}${(userslayerxp / 1000000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 100000:
						remainxp = 400000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv7**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 400000 * 100)}${(userslayerxp / 400000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 20000:
						remainxp = 100000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv6**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 100000 * 100)}${(userslayerxp / 100000 * 100).toFixed(1)}%`);
						break;
					case userslayerxp >= 5000:
						remainxp = 20000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv5**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 20000 * 100)}${(userslayerxp / 20000 * 100).toFixed(1)}%`);
						break;
					case ((slayername == "zombie" || slayername == "spider") && userslayerxp >= 1000) || ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 1500):
						remainxp = 5000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv4**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 5000 * 100)}${(userslayerxp / 5000 * 100).toFixed(1)}%`);
						break;
					case (slayername == "zombie" || slayername == "spider") && userslayerxp >= 200:
						remainxp = 1000 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 1000 * 100)}${(userslayerxp / 1000 * 100).toFixed(1)}%`);
						break;
					case (slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 250:
						remainxp = 1500 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 1500 * 100)}${(userslayerxp / 1500 * 100).toFixed(1)}%`);
						break;
					case (slayername == "zombie" && userslayerxp >= 15) || (slayername == "spider" && userslayerxp >= 25):
						remainxp = 200 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 200 * 100)}${(userslayerxp / 200 * 100).toFixed(1)}%`);
						break;
					case (slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 30:
						remainxp = 250 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${Utils.createProgressBar(userslayerxp / 250 * 100)}${(userslayerxp / 250 * 100).toFixed(1)}%`);
						break;
					default:
						remainxp = 5 - userslayerxp;
						await interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | このプレイヤーの${showonlyslayername}はLv1に達していません。次のレベルまでに必要なXPは${remainxp}です。`);
						break;
				}
				return;
			}

			if (interaction.commandName == "profile") {
				const username = interaction.options.get("username").value;

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
				const username = interaction.options.get("username").value;
				const reponame = interaction.options.get("repository").value;
				await interaction.reply("LOCの計算中です...");
				const locdata = await axios.get(`https://api.codetabs.com/v1/loc?github=${username}/${reponame}`)
					.then(res => {
						return res.data;
					});
				for (const element of locdata) {
					if (element.language === "Total") {
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

				const backuptime = interaction.options.get("backuptime").value;
				const directory = "./Backups";
				const sortedFiles = Utils.getFilesSortedByDate(directory).reverse();
				const wannabackuptime = backuptime - 1;
				const wannabackup = sortedFiles[wannabackuptime];

				if (wannabackup == undefined) {
					interaction.reply("その期間のバックアップファイルは存在しません。");
					return;
				}

				const allbackupfilescount = fs.readdirSync(`./Backups/${wannabackup}`).length;
				const message = await interaction.reply(`${wannabackup}のバックアップの復元中です。(${allbackupfilescount}ファイル)\n${Utils.createProgressBar(0)}`);
				const percentstep = 100 / allbackupfilescount;
				let backupfilescount = 0;
				for (const backupfiles of fs.readdirSync(`./Backups/${wannabackup}`)) {
					fs.copySync(`./Backups/${wannabackup}/${backupfiles}`,`./${backupfiles}`);
					backupfilescount++;
					await message.edit(`バックアップの復元中です。(${backupfilescount}ファイル)\n${Utils.createProgressBar(Math.floor(percentstep * backupfilescount))}(${Math.floor(percentstep * backupfilescount)}%)`);
				}
				await message.edit(`バックアップの復元が完了しました。(${allbackupfilescount}ファイル)`);
				return;
			}

			if (interaction.commandName == "backuplist") {
				if (interaction.user.id != BotadminId) {
					await interaction.reply("このコマンドはBOT管理者のみ実行できます。");
					return;
				}
				
				const directory = "./Backups";
				const sortedFiles = Utils.getFilesSortedByDate(directory).reverse();
				const backupfileslist = [];
				for (let i = 0; i < Math.min(10, sortedFiles.length); i++) {
					const inputString = sortedFiles[i];
					const [datePart, hour, minute] = inputString.split(" ");
					const [year, month, day] = datePart.split("-");
					const formattedMonth = month.length === 1 ? "0" + month : month;
					const formattedDay = day.length === 1 ? "0" + day : day;
					const formattedHour = hour.length === 1 ? "0" + hour : hour;
					const formattedMinute = minute.length === 1 ? "0" + minute : minute;
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
				const message = interaction.options.get("message").value;
				await interaction.reply({ content: "送信しますね！", ephemeral: true });
				await interaction.channel.send(message);
				return;
			}

			if (interaction.commandName == "talkcount") {
				const userid = interaction.user.id;
				let serverJSONdata = fs.readJsonSync(`./ServerDatas/talkcount.json`);
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					serverJSONdata = null;
					return;
				}
				
				if (serverJSONdata[interaction.guildId][userid] == undefined) {
					await interaction.reply("あなたはまだこのサーバーで喋ったことがないようです。");
					serverJSONdata = null;
					return;
				}

				await interaction.reply(`あなたはこのサーバーで**${serverJSONdata[interaction.guildId][userid]}**回喋りました。`);
				serverJSONdata = null;
				return;
			}

			if (interaction.commandName == "talkranking") {
				let serverJSONdata = fs.readJsonSync(`./ServerDatas/talkcount.json`);
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					serverJSONdata = null;
					return;
				}
				await interaction.reply("ランキングを取得中です...");
				let talkranking = [];
				for (const [key, value] of Object.entries(serverJSONdata[interaction.guildId])) {
					talkranking.push([key, value]);
				}
				talkranking.sort((a, b) => {
					return b[1] - a[1];
				});
				let talkrankingmessage = ["__**話した回数ランキング**__"];
				for (let i = 0; i < Math.min(talkranking.length, 10); i++) {
					const userdata = await client.users.fetch(talkranking[i][0]);
					const username = !userdata.globalName ? userdata.username : userdata.globalName;
					talkrankingmessage.push(`**${i + 1}位**: ${username} | ${talkranking[i][1]}回`);
				}
				await interaction.channel.send(talkrankingmessage.join("\n"));
				serverJSONdata = null;
				return;
			}

			if (interaction.commandName == "talklevel") {
				const userid = interaction.user.id;
				let serverJSONdata = fs.readJsonSync(`./ServerDatas/talkcount.json`);
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					serverJSONdata = null;
					return;
				}
				
				if (serverJSONdata[interaction.guildId][userid] == undefined) {
					await interaction.reply("あなたはまだこのサーバーで喋ったことがないようです。");
					serverJSONdata = null;
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
				await interaction.reply(`あなたのこのサーバーでのレベルは**Lv${level}**です。\n**${(talkcount / nextlevelcount * 100).toFixed(2)}**%${Utils.createProgressBar(talkcount / nextlevelcount * 100)}(次のレベル: **${talkcount} / ${nextlevelcount}**)`);
				serverJSONdata = null;
				return;
			}

			if (interaction.commandName == "talklevelranking") {
				let serverJSONdata = fs.readJsonSync(`./ServerDatas/talkcount.json`);
				if (serverJSONdata[interaction.guildId] == undefined) {
					await interaction.reply("このサーバーでは、まだ誰も喋っていないようです。");
					serverJSONdata = null;
					return;
				}

				await interaction.reply("ランキングを取得中です...");
				let talkranking = [];
				for (const [key, value] of Object.entries(serverJSONdata[interaction.guildId])) {
					talkranking.push([key, value]);
				}
				talkranking.sort(function(a, b) {
					return b[1] - a[1];
				});
				let talkrankingmessage = ["__**トークレベルランキング**__"];
				for (let i = 0; i < Math.min(talkranking.length, 10); i++) {
					const userdata = await client.users.fetch(talkranking[i][0]);
					const username = !userdata.globalName ? userdata.username : userdata.globalName;
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
					talkrankingmessage.push(`**${i + 1}位**: ${username} | Lv. **${level}** | 次のレベル: **${talkcount} / ${nextlevelcount}** (**${(talkcount / nextlevelcount * 100).toFixed(2)}**%)`);
				}
				await interaction.channel.send(talkrankingmessage.join("\n"));
				serverJSONdata = null;
				return;
			}
		} catch (e) {
			if (e.message == "No data found") {
				await interaction.channel.send("マップが見つかりませんでした。")
					.catch(async () => {
						await client.users.cache.get(interaction.user.id).send("こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！")
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			} else {
				await asciify("Error", { font: "larry3d" })
					.then(msg => console.log(msg))
					.catch(err => console.log(err));
				console.log(e);
				await interaction.channel.send(`${interaction.user.username}さんのコマンドの実行中にエラーが発生しました。`)
					.catch(async () => {
						await client.users.cache.get(interaction.user.id).send("こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！")
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
				let serverJSONdata = fs.readJsonSync("./ServerDatas/talkcount.json");
				if (serverJSONdata[message.guildId] == undefined) {
					serverJSONdata[message.guildId] = {};
				}
				if (serverJSONdata[message.guildId][message.author.id] == undefined) {
					serverJSONdata[message.guildId][message.author.id] = 1;
				} else if (!message.content.startsWith("!")) {
					serverJSONdata[message.guildId][message.author.id] += 1;
				}
				fs.writeJsonSync("./ServerDatas/talkcount.json", serverJSONdata, { spaces: 4, replacer: null });
				serverJSONdata = null;
			} catch (e) {
				console.log(e);
			}

			if (message.content.split(" ")[0] == "!map") {
				commandLogs(message, "map", 1);
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
					.addFields({ name: "Music and Backgroud", value: `:musical_note: [Song Preview](https://b.ppy.sh/preview/${mapInfo.beatmapset_id}.mp3)　:frame_photo: [Full background](https://assets.ppy.sh/beatmaps/${mapInfo.beatmapset_id}/covers/raw.jpg)` })
					.setAuthor({ name: `Created by ${mapInfo.creator}`, iconURL: mapperIconURL, url: mapperUserURL })
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapInfo.version}__**] **+${Mods.str}**`, value: `Combo: \`${mapInfo.max_combo}x\` Stars: \`${sr[100].sr.toFixed(2)}★\` \n Length: \`${Utils.formatTime(Number(totalLength))} (${Utils.formatTime(Number(totalHitLength))})\` BPM: \`${BPM}\` Objects: \`${objectCount}\` \n CS: \`${Cs}\` AR: \`${Ar}\` OD: \`${Od}\` HP: \`${Hp}\` Spinners: \`${mapInfo.count_spinner}\``, inline: true })
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
				commandLogs(message, "recent", 1);
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						allUser = null;
						return;
					}
					allUser = null;
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
						await message.reply("使い方: !r(o, t, c, m) (osu!ユーザーネーム)");
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
				}, Utils.modeConvertAcc(currentMode));
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
				
				const { ifFCPP, ifFCHits, ifFCAcc } = osuLibrary.CalculateIfFC.calculate(recentScore, currentMode, objectData, passedObjects, mods.calc, Number(mapData.max_combo), map);
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
				const formattedLength = Utils.formatTime(totalLength);
				const formattedHitLength = Utils.formatTime(hitLength);
				const formattedHits = Utils.formatHits(recentScore, currentMode);
				const formattedIfFCHits = Utils.formatHits(ifFCHits, currentMode);

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
					.addFields({ name: "`Grade`", value: `${Utils.rankconverter(userRecentData.rank)} + ${mods.str}`, inline: true })
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
							.addFields({ name: rankingString, value: `${Utils.rankconverter(userRecentData.rank)} + **${mods.str}**　**Score**: ${Number(userRecentData.score).toLocaleString()}　**Acc**: ${recentAcc}% \n **PP**: **${recentPp}** / ${ssPp.pp.toFixed(2)}pp　${ifFCMessage} \n **Combo**: **${userRecentData.maxcombo}**x / ${mapData.max_combo}x　**Hits**: ${formattedHits}`, inline: true });
						await sentMessage.edit({ embeds: [embednew] });
					}, 20000);
				});
				return;
			}
			
			if (/^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/.test(message.content) || /^https:\/\/osu\.ppy\.sh\/b\/\d+$/.test(message.content) || /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/.test(message.content)) {
				const channelid = message.channel.id;
				let allchannels = fs.readJsonSync("./ServerDatas/BeatmapLinkChannels.json");
				if (!allchannels.Channels.includes(channelid)) return;
				allchannels = null;
				commandLogs(message, "マップリンク", 1);
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
					.setDescription(`**Length**: ${Utils.formatTime(Number(mapData.total_length))} (${Utils.formatTime(Number(mapData.hit_length))}) **BPM**: ${mapData.bpm} **Mods**: -\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapData.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapData.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapData.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapData.beatmapset_id})`)
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapData.version}__**]`, value: `▸**Difficulty:** ${sr[100].sr.toFixed(2)}★ ▸**Max Combo:** ${mapData.max_combo}x\n▸**OD:** ${mapData.diff_overall} ▸**CS:** ${mapData.diff_size} ▸**AR:** ${mapData.diff_approach} ▸**HP:** ${mapData.diff_drain}\n▸**PP**: ○ **95**%-${sr[95].pp.toFixed(2)} ○ **99**%-${sr[99].pp.toFixed(2)} ○ **100**%-${sr[100].pp.toFixed(2)}`, inline: false })
					.setTimestamp()
					.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
					.setFooter({ text: `${osuLibrary.Tools.mapstatus(mapData.approved)} mapset of ${mapData.creator}` });
				await message.channel.send({ embeds: [embed] });
				return;
			}

			if (message.content.split(" ")[0] == "!m") {
				commandLogs(message, "mods", 1);
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
					.setDescription(`**Length**: ${Utils.formatTime(totalLength)} (${Utils.formatTime(totalHitLength)}) **BPM**: ${BPM} **Mods**: ${Mods.str}\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapData.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapData.beatmapset_id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${mapData.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapData.beatmapset_id})`)
					.addFields({ name: `${osuLibrary.Tools.modeEmojiConvert(mode)} [**__${mapData.version}__**]`, value: `▸**Difficulty:** ${sr[100].sr.toFixed(2)}★ ▸**Max Combo:** ${mapData.max_combo}x\n▸**OD:** ${Od} ▸**CS:** ${Cs} ▸**AR:** ${Ar} ▸**HP:** ${Hp}\n▸**PP**: ○ **95**%-${sr[95].pp.toFixed(2)} ○ **99**%-${sr[99].pp.toFixed(2)} ○ **100**%-${sr[100].pp.toFixed(2)}`, inline: false })
					.setTimestamp()
					.setImage(osuLibrary.URLBuilder.backgroundURL(mapData.beatmapset_id))
					.setFooter({ text: `${osuLibrary.Tools.mapstatus(mapData.approved)} mapset of ${mapData.creator}` });
				await message.channel.send({ embeds: [embed] });
				return;
			}

			if (message.content.split(" ")[0] == "!c") {
				commandLogs(message, "compare", 1);
				const regex = /^https:\/\/osu\.ppy\.sh\/beatmapsets\/\d+#[a-z]+\/\d+$/;
				const regex2 = /^https:\/\/osu\.ppy\.sh\/b\/\d+$/;
				const regex3 = /^https:\/\/osu\.ppy\.sh\/beatmaps\/\d+$/;
				let playername;
				let maplink;
				if (regex.test(message.content.split(" ")[1]) || regex2.test(message.content.split(" ")[1]) || regex3.test(message.content.split(" ")[1])) {
					maplink = message.content.split(" ")[1];
					if (message.content.split(" ")[2] == undefined) {
						let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
						const username = allUser["Bancho"][message.author.id]?.name;
						if (username == undefined) {
							await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
							allUser = null;
							return;
						}
						allUser = null;
						playername = username;
					} else {
						playername = message.content.split(" ")?.slice(2)?.join(" ");
					}
				} else if (message.content.split(" ")[1] == undefined) {
					let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						allUser = null;
						return;
					}
					allUser = null;
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
				}, Utils.modeConvertAcc(mode));
				const userPlaysHit = Utils.formatHits(userBestPlays, mode);
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${mapData.artist} - ${mapData.title} [${mapData.version}]`)
					.setThumbnail(osuLibrary.URLBuilder.thumbnailURL(mapData.beatmapset_id))
					.setURL(mapUrl)
					.setAuthor({ name: `${playersdata.username}: ${Number(playersdata.pp_raw).toLocaleString()}pp (#${Number(playersdata.pp_rank).toLocaleString()} ${playersdata.country}${Number(playersdata.pp_country_rank).toLocaleString()})`, iconURL: playerIconUrl, url: playerUrl })
					.addFields({ name: rankingString, value: `${Utils.rankconverter(userPlays[0].rank)} **+ ${bestMods.str}** [${srppData.sr.toFixed(2)}★] **Score**: ${Number(userPlays[0].score).toLocaleString()} **Acc**: ${recentAcc}% \n **PP**: **${Number(userPlays[0].pp).toFixed(2)}** / ${srppData.pp.toFixed(2)}PP **Combo**: **${userPlays[0].maxcombo}x** / ${mapData.max_combo}x \n${userPlaysHit}`, inline: false })
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
						}, Utils.modeConvertAcc(mode));
						valueString += `${Utils.rankconverter(userPlays[i].rank)} + **${Mods.str}** [${srppData.sr.toFixed(2)}★] ${Number(userPlays[i].pp).toFixed(2)}pp (${acc}%) ${userPlays[i].maxcombo}x Miss: ${userPlays[i].countmiss}\n`;
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
				commandLogs(message, "what if", 1);

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
					let allUser = fs.readJsonSync("./ServerDatas/PlayerData.json");
					const username = allUser["Bancho"][message.author.id]?.name;
					if (username == undefined) {
						await message.reply("ユーザー名が登録されていません。/osuregで登録するか、ユーザー名を入力してください。");
						allUser = null;
						return;
					}
					allUser = null;
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
				commandLogs(message, "クイズの答え", 1);
				const answer = message.content.replace("?", "").toLowerCase().replace(/ /g, "");

				let parsedjson = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
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

				let answerer = "";
				const matchPercentage = Math.round(Utils.matchPercentage(answer, currentanswer));
				switch (true) {
					case answer == currentanswer:
						await message.reply("正解です！");
						answerer = `:o::clap:${message.author.username}`;
						break;
					case matchPercentage >= 90 && !isperfect:
						await message.reply(`ほぼ正解です！(正答率: ${matchPercentage}%)\n答え: ${currenttitle}`);
						answerer = `:o:${message.author.username}`;
						break;
					case matchPercentage >= 50 && !isperfect:
						await message.reply(`半分正解です！(正答率: ${matchPercentage}%)\n答え: ${currenttitle}`);
						answerer = `:o:${message.author.username}`;
						break;
					case matchPercentage >= 35 && !isperfect:
						await message.reply(`惜しかったです！(正答率: ${matchPercentage}%)\n答え: ${currenttitle}`);
						answerer = `:o:${message.author.username}`;
						break;
					default:
						await message.reply(`不正解です;-;\n答えの約${matchPercentage}%を入力しています。`);
						parsedjson = null;
						return;
				}

				let foundflagforans = false;
				for (let element of parsedjson) {
					if (foundflagforans) break;
					if (!element.quizstatus && !foundflagforans) {
						foundflagforans = true;
						element.quizstatus = true;
						element.Answerer = answerer;
						fs.writeJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`, parsedjson, { spaces: 4, replacer: null });
					}
				}
				parsedjson = null;
				let afterjson = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
				let foundflagforafterjsonanswer = false;
				for (const element of afterjson) {
					if (!element.quizstatus && !foundflagforafterjsonanswer) {
						if (element.mode == "BG") {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のBGを表示します。`);
							await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: "arraybuffer" })
								.then(async res => {
									let BGdata = res.data;
									await message.channel.send({ files: [{ attachment: BGdata, name: "background.jpg" }] });
									BGdata = null;
								});
							afterjson = null;
							return;
						} else {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のプレビューを再生します。`);
							await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: "arraybuffer" })
								.then(async res => {
									let audioData = res.data;
									await message.channel.send({ files: [{ attachment: audioData, name: "audio.mp3" }] });
									audioData = null;
								});
							afterjson = null;
							return;
						}
					}
				}

				if (!foundflagforafterjsonanswer) {
					let answererarray = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
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
					answererarray = null;
					afterjson = null;
				}
				return;
			}

			if (message.content == "!skip") {
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					await message.reply("クイズが開始されていません。");
					return;
				}
				commandLogs(message, "クイズのスキップ", 1);

				let parsedjson = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
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
					if (foundflagforans) break;
					if (!element.quizstatus && !foundflagforans) {
						foundflagforans = true;
						element.quizstatus = true;
						element.Answerer = `:x:${message.author.username}さんによってスキップされました。`;
						fs.writeJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`, parsedjson, { spaces: 4, replacer: null });
					}
				}
				parsedjson = null;

				let afterjson = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
				let foundflagforafterjsonanswer = false;
				for (const element of afterjson) {
					if (!element.quizstatus && !foundflagforafterjsonanswer) {
						if (element.mode == "BG") {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のBGを表示します。`);
							await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: "arraybuffer" })
								.then(async res => {
									let BGdata = res.data;
									await message.channel.send({ files: [{ attachment: BGdata, name: "background.jpg" }] });
									BGdata = null;
								});
							afterjson = null;
							return;
						} else {
							foundflagforafterjsonanswer = true;
							await message.channel.send(`問題${element.number}のプレビューを再生します。`);
							await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: "arraybuffer" })
								.then(async res => {
									let audioData = res.data;
									await message.channel.send({ files: [{ attachment: audioData, name: "audio.mp3" }] });
									audioData = null;
								});
							afterjson = null;
							return;
						}
					}
				}

				if (!foundflagforafterjsonanswer) {
					let answererarray = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
					let answererstring = "";
					for (let i = 0; i < answererarray.length; i++) {
						if (answererarray[i].Answerer == "") continue;
						answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`;
					}
					await message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`);
					fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`);
					answererarray = null;
					afterjson = null;
				}
				return;
			}

			if (message.content == "!hint") {
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					await message.reply("クイズが開始されていません。");
					return;
				}
				commandLogs(message, "クイズのヒント", 1);

				let parsedjson = fs.readJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`);
				let currenttitle = "";
				let foundflagforjson = false;
				for (const element of parsedjson) {
					if (foundflagforjson) break;
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						if (element.hint) {
							await message.reply("ヒントは１問につき１回まで使用できます。");
							return;
						}
						currenttitle = element.name;
						element.hint = true;
						fs.writeJsonSync(`./OsuPreviewquiz/${message.channel.id}.json`, parsedjson, { spaces: 4, replacer: null });
					}
				}

				parsedjson = null;
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
				commandLogs(message, "エロあるよ（笑）", 1);
				if (Math.floor(Math.random() * 10) == 0) {
					let eroVideo = fs.readFileSync("./eroaru.mp4");
					await message.reply({ files: [{ attachment: eroVideo, name: "donarudo.mp4" }] });
					eroVideo = null;
					return;
				} else {
					let eroVideo = fs.readFileSync("./eronai.mp4");
					await message.reply({ files: [{ attachment: eroVideo, name: "donarudo.mp4" }] });
					eroVideo = null;
					return
				}
			}

			if (message.content == "h!help") {
				commandLogs(message, "ヘルプ", 1);
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
					"osuマップリンク": "マップ情報を計算して表示します。/linkで有効化できます。",
					"四則演算式(1+1, 1-1, 1*1, 1/1, 1^1など)": "計算機です。チャットに書かれると計算します。",
					"時間計算(123.7時間、123.7分など)": "時間計算機です。チャットに書かれると時間を計算します。"
				};
			
				let sendMessage = "__\*\*コマンド一覧\*\*\__\n";
				for (const [key, value] of Object.entries(commandInfo)) {
					sendMessage += `- \`\`\`${key} | ${value}\`\`\`\n`;
				}

				await message.reply(sendMessage);
				return;
			}

			if (RegExp(/^\d+([-+*/^])\d+$/).exec(message.content.replace(/ /g, ""))) {
				commandLogs(message, "計算式", 1);
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

			if (/^\d+\.\d+時間$/.test(message.content)) {
				commandLogs(message, "時間計算", 1);
				const totalHours = Number(RegExp(/^\d+\.\d+/).exec(message.content)[0]);
				if (isNaN(totalHours)) return;
				await message.reply(`${Math.floor(totalHours)}時間 ${Math.floor((totalHours - Math.floor(totalHours)) * 60)}分 ${Math.round(((totalHours - Math.floor(totalHours)) * 60 - Math.floor((totalHours - Math.floor(totalHours)) * 60)) * 60)}秒`);
				return;
			}
			
			if (/^\d+\.\d+分$/.test(message.content)) {
				commandLogs(message, "時間計算", 1);
				const totalminutes = Number(RegExp(/^\d+\.\d+/).exec(message.content)[0]);
				if (isNaN(totalminutes)) return;
				if (totalminutes >= 60) {
					await message.reply(`${Math.floor(totalminutes / 60)}時間 ${Math.floor(totalminutes % 60)}分 ${Math.round(((totalminutes % 60) - Math.floor(totalminutes % 60)) * 60)}秒`);
				} else {
					await message.reply(`${Math.floor(totalminutes)}分 ${Math.round((totalminutes - Math.floor(totalminutes)) * 60)}秒`);
				}
				return;
			}

			if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.includes(".avi") || attachment.url.includes(".mov") || attachment.url.includes(".mp4") || attachment.url.includes(".png") || attachment.url.includes(".jpg") || attachment.url.includes(".gif")) && message.channel.id == Furrychannel) {
				if (message.author.bot) return;
				commandLogs(message, "Furry画像登録", 1);
				let dataBase = fs.readJsonSync("./Pictures/Furry/DataBase.json");
				for (const attachment of message.attachments.values()) {
					const imageURL = attachment.url;
					const imageFile = await axios.get(imageURL, { responseType: "arraybuffer" });
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
				fs.writeJsonSync("./Pictures/Furry/DataBase.json", dataBase, { spaces: 4, replacer: null });
				dataBase = null;
				if (message.attachments.size == 1) {
					await message.reply("Furryが保存されました");
				} else {
					await message.reply(`${message.attachments.size}個のFurryが保存されました`);
				}
				return;
			}

			if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.includes(".avi") || attachment.url.includes(".mov") || attachment.url.includes(".mp4") || attachment.url.includes(".png") || attachment.url.includes(".jpg") || attachment.url.includes(".gif"))) {
				if (message.author.bot) return;
				const currentDir = fs.readdirSync("./Pictures/tag").filter(folder => fs.existsSync(`./Pictures/tag/${folder}/DataBase.json`));
				for (const folder of currentDir) {
					let dataBase = fs.readJsonSync(`./Pictures/tag/${folder}/DataBase.json`);
					if (dataBase.id == message.channel.id) {
						commandLogs(message, "pic画像登録", 1);
						let fileNameArray = [];
						for (const attachment of message.attachments.values()) {
							const imageURL = attachment.url;
							const imageFile = await axios.get(imageURL, { responseType: "arraybuffer" });
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
						fs.writeJsonSync(`./Pictures/tag/${folder}/DataBase.json`, dataBase, { spaces: 4, replacer: null });
						dataBase = null;
						if (message.attachments.size == 1) {
							await message.reply(`ファイルが保存されました(${fileNameArray[0]})`);
						} else {
							await message.reply(`${message.attachments.size}個のファイルが保存されました\nファイル名: ${fileNameArray.join(", ")}`);
						}
						return;
					}
					dataBase = null;
				}
			}

			if (!message.content.startsWith("!")) {
				if (message.author.bot || message.content == "") return;
				let allQuotes = fs.readJsonSync("./ServerDatas/Quotes.json");
				for (const key in allQuotes) {
					if (allQuotes[key].id == message.channel.id) {
						commandLogs(message, "名言登録", 1);
						allQuotes[key].quotes.push(message.content);
						fs.writeJsonSync("./ServerDatas/Quotes.json", allQuotes, { spaces: 4, replacer: null });
						await message.reply(`名言が保存されました`);
						allQuotes = null;
						return;
					}
				}
				allQuotes = null;
			}
		} catch (e) {
			if (e.message == "No data found") {
				await message.reply("マップが見つかりませんでした。")
					.catch(async () => {
						await client.users.cache.get(message.author.id).send("こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！")
							.then(() => {
								console.log("DMに権限に関するメッセージを送信しました。");
							})
							.catch(() => {
								console.log("エラーメッセージの送信に失敗しました。");
							});
					});
			} else {
				await asciify("Error", { font: "larry3d" })
					.then(msg => console.log(msg))
					.catch(err => console.log(err));
				console.log(e);
				await message.reply(`${message.author.username}さんのコマンドの実行中にエラーが発生しました。`)
					.catch(async () => {
						await client.users.cache.get(message.author.id).send("こんにちは！\nコマンドを送信したそうですが、権限がなかったため送信できませんでした。もう一度Botの権限について見てみてください！")
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

client.on(Events.Error, async (error) => {
	await asciify("Discord API Error", { font: "larry3d" })
		.then(msg => console.log(msg))
		.catch(err => console.log(err));
	console.log(`エラー名: ${error.name}\nエラー内容: ${error.message}`);
});

function commandLogs(message, command, mode) {
	let now = new Date();
	if (mode == 1) {
		console.log(`[${now.toLocaleString()}] ${message.author.username}さんが${command}コマンドを送信しました`);
	} else {
		console.log(`[${now.toLocaleString()}] ${!message.user.globalName ? message.user.username : message.user.globalName}さんが${command}コマンドを送信しました。`);
	}
	message = null;
	command = null;
	mode = null;
	now = null;
}

async function checkMap() {
	await checkqualified();
	await checkranked();
	await checkloved();
}

function checkqualified() {
	return new Promise (async resolve => {
		const modeconvertforSearch = (mode) => mode == "catch" ? "fruits" : mode;
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
				let allBeatmaps = fs.readJsonSync("./ServerDatas/Beatmaps/Beatmaps.json");
				const differentQFarray = Utils.findDifferentElements(allBeatmaps.Qualified[mode], qfarray);
				allBeatmaps.Qualified[mode] = qfarray;
				fs.writeJsonSync("./ServerDatas/Beatmaps/Beatmaps.json", allBeatmaps, { spaces: 4, replacer: null });
				allBeatmaps = null;
				if (differentQFarray == null) continue;
				for (const differentQF of differentQFarray) {
					let parsedjson = fs.readJsonSync(`./ServerDatas/Beatmaps/${mode}.json`);
					let foundflag = false;
					for (const element of parsedjson) {
						if (element.id == differentQF && !foundflag) {
							foundflag = true;
							element.qfdate = new Date();
							element.rankeddate = "-";
							fs.writeJsonSync(`./ServerDatas/Beatmaps/${mode}.json`, parsedjson, { spaces: 4, replacer: null });
							break;
						}
					}

					if (!foundflag) {
						parsedjson.push({
							id: differentQF,
							qfdate: new Date(),
							rankeddate: "-"
						});
						fs.writeJsonSync(`./ServerDatas/Beatmaps/${mode}.json`, parsedjson, { spaces: 4, replacer: null });
					}
					parsedjson = null;

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

					const mapMaxInfo = await new osuLibrary.GetMapData(QFBeatmapsMaxSrId, apikey, Utils.modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(QFBeatmapsMinSrId, apikey, Utils.modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMaxSrId, 0, Utils.modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMinSrId, 0, Utils.modeConvertMap(mode));
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
					const maptime = Utils.formatTime(lengthsec);
					const maptimeDT = Utils.formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;

					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${Utils.formatNumber(hours)}時${Utils.formatNumber(minutes)}分`;

					let qfparsedjson = fs.readJsonSync(`./ServerDatas/Beatmaps/${mode}.json`);
					const averagearray = [];
					for (const element of qfparsedjson) {
						const qfdate = new Date(element.qfdate);
						if (element.rankeddate == "-") continue;
						const rankeddate = new Date(element.rankeddate);
						const rankeddays = Math.floor((rankeddate - qfdate) / (1000 * 60 * 60 * 24));
						if (rankeddays <= 5 || rankeddays >= 8) continue;
						averagearray.push(rankeddate - qfdate);
					}
					qfparsedjson = null;
					let average = averagearray.reduce((sum, element) => sum + element, 0) / averagearray.length;
					if (isNaN(average)) average = 604800000;
		
					const sevenDaysLater = new Date(now.getTime() + average);
					const rankedmonth = sevenDaysLater.getMonth() + 1;
					const rankedday = sevenDaysLater.getDate();
					const rankedhours = sevenDaysLater.getHours();
					const rankedminutes = sevenDaysLater.getMinutes();
					const rankeddateString = `${rankedmonth}月${rankedday}日 ${Utils.formatNumber(rankedhours)}時${Utils.formatNumber(rankedminutes)}分`;
		
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
					let MapcheckChannels = fs.readJsonSync(`./ServerDatas/MapcheckChannels.json`);
					for (const element of MapcheckChannels.Qualified[mode]) {
						try {
							if (client.channels.cache?.get(element) == undefined) continue;
							await client.channels.cache.get(element).send({ embeds: [embed] });
							const membersdata = await client.channels.cache.get(element).guild.members.fetch();
							let mentionstring = [];
							let allUser = fs.readJsonSync(`./ServerDatas/MentionUser.json`);
							const mentionUser = allUser["Qualified"][element]?.[mode];
							allUser = null;
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
					MapcheckChannels = null;
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
	return new Promise (async resolve => {
		const modeconvertforSearch = (mode) => mode == "catch" ? "fruits" : mode;
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
			let allBeatmaps = fs.readJsonSync("./ServerDatas/Beatmaps/Beatmaps.json");
			const differentrankedarray = Utils.findDifferentElements(allBeatmaps.Ranked[mode], rankedarray);
			allBeatmaps.Ranked[mode] = rankedarray;
			fs.writeJsonSync("./ServerDatas/Beatmaps/Beatmaps.json", allBeatmaps, { spaces: 4, replacer: null });
			allBeatmaps = null;
			if (differentrankedarray == null) continue;
			for (const differentranked of differentrankedarray) {
				try {
					let qfparsedjson = fs.readJsonSync(`./ServerDatas/Beatmaps/${mode}.json`);
					let rankederrorstring = "取得できませんでした";
					for (const element of qfparsedjson) {
						if (element.id == differentranked) {
							element.rankeddate = new Date();
							fs.writeJsonSync(`./ServerDatas/Beatmaps/${mode}.json`, qfparsedjson, { spaces: 4, replacer: null });
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
					qfparsedjson = null;
		
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

					const mapMaxInfo = await new osuLibrary.GetMapData(rankedBeatmapsMaxSrId, apikey, Utils.modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(rankedBeatmapsMinSrId, apikey, Utils.modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(rankedBeatmapsMaxSrId, 0, Utils.modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(rankedBeatmapsMinSrId, 0, Utils.modeConvertMap(mode));
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
					const maptime = Utils.formatTime(lengthsec);
					const maptimeDT = Utils.formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;
		
					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${Utils.formatNumber(hours)}時${Utils.formatNumber(minutes)}分`;
		
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
					let MapcheckChannels = fs.readJsonSync(`./ServerDatas/MapcheckChannels.json`);
					for (const element of MapcheckChannels.Qualified[mode]) {
						try {
							if (client.channels.cache?.get(element) == undefined) continue;
							await client.channels.cache.get(element).send({ embeds: [embed] });
							const membersdata = await client.channels.cache.get(element).guild.members.fetch();
							let mentionstring = [];
							let allUser = fs.readJsonSync(`./ServerDatas/MentionUser.json`);
							const mentionUser = allUser["Ranked"][element]?.[mode];
							allUser = null;
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
					MapcheckChannels = null;
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
	return new Promise(async resolve => {
		const modeconvertforSearch = (mode) => mode == "catch" ? "fruits" : mode;
		const modeArray = ["osu", "taiko", "catch", "mania"];
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
			let allBeatmaps = fs.readJsonSync("./ServerDatas/Beatmaps/Beatmaps.json");
			const differentlovedarray = Utils.findDifferentElements(allBeatmaps.Loved[mode], lovedarray);
			allBeatmaps.Loved[mode] = lovedarray;
			fs.writeJsonSync("./ServerDatas/Beatmaps/Beatmaps.json", allBeatmaps, { spaces: 4, replacer: null });
			allBeatmaps = null;
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

					const mapMaxInfo = await new osuLibrary.GetMapData(lovedBeatmapsMaxSrId, apikey, Utils.modeConvertMap(mode)).getData();
					const mapMinInfo = await new osuLibrary.GetMapData(lovedBeatmapsMinSrId, apikey, Utils.modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(lovedBeatmapsMaxSrId, 0, Utils.modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(lovedBeatmapsMinSrId, 0, Utils.modeConvertMap(mode));
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
					const maptime = Utils.formatTime(lengthsec);
					const maptimeDT = Utils.formatTime(lengthsecDT);
					const maptimestring = `${maptime} (DT ${maptimeDT})`;
		
					const now = new Date();
					const month = now.getMonth() + 1;
					const day = now.getDate();
					const hours = now.getHours();
					const minutes = now.getMinutes();
					const dateString = `${month}月${day}日 ${Utils.formatNumber(hours)}時${Utils.formatNumber(minutes)}分`;

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
					let MapcheckChannels = fs.readJsonSync(`./ServerDatas/MapcheckChannels.json`);
					for (const element of MapcheckChannels.Loved[mode]) {
						if (client.channels.cache?.get(element) == undefined) continue;
						try {
							await client.channels.cache.get(element).send({ embeds: [embed] })
							const membersdata = await client.channels.cache.get(element).guild.members.fetch()
							let mentionstring = [];
							let allUser = fs.readJsonSync(`./ServerDatas/MentionUser.json`);
							const mentionUser = allUser["Loved"][element]?.[mode];
							allUser = null;
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
					MapcheckChannels = null;
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
		let qfparsedjson = fs.readJsonSync(`./ServerDatas/Beatmaps/${mode}.json`);
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

					const mapInfo = await new osuLibrary.GetMapData(QFBeatmapsMaxSrId, apikey, Utils.modeConvertMap(mode)).getData();

					const maxCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMaxSrId, 0, Utils.modeConvertMap(mode));
					const minCalculator = new osuLibrary.CalculatePPSR(QFBeatmapsMinSrId, 0, Utils.modeConvertMap(mode));
					const maxsrpp = await maxCalculator.calculateSR();
					const minsrpp = await minCalculator.calculateSR();
					const maxdtpp = await maxCalculator.calculateDT();
					const mindtpp = await minCalculator.calculateDT();
					let srstring = maxsrpp.sr == minsrpp.sr ? `★${maxsrpp.sr.toFixed(2)} (DT ★${maxdtpp.sr.toFixed(2)})` : `★${minsrpp.sr.toFixed(2)} ~ ${maxsrpp.sr.toFixed(2)} (DT ★${mindtpp.sr.toFixed(2)} ~ ${maxdtpp.sr.toFixed(2)})`;
					let ppstring = maxsrpp.pp == minsrpp.pp ? `${maxsrpp.pp.toFixed(2)}pp (DT ${maxdtpp.pp.toFixed(2)}pp)` : `${minsrpp.pp.toFixed(2)} ~ ${maxsrpp.pp.toFixed(2)}pp (DT ${mindtpp.pp.toFixed(2)} ~ ${maxdtpp.pp.toFixed(2)}pp)`;
					sevenDayAgoQf.push({ name : `${count}. **${mapInfo.title} - ${mapInfo.artist}**`, value : `▸Mapped by **${mapInfo.creator}**\n▸SR: ${srstring}\n▸PP: ${ppstring}\n▸**Download** | [map](https://osu.ppy.sh/beatmapsets/${element.id}) | [Nerinyan](https://api.nerinyan.moe/d/${element.id}) | [Nerinyan (No Vid)](https://api.nerinyan.moe/d/${element.id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${element.id})\n**Qualified**: ${year}年 ${month}月 ${day}日 ${Utils.formatNumber(hours)}:${Utils.formatNumber(minutes)}\n` });
				}
			} catch (e) {
				console.log(e);
				continue;
			}
		}
		qfparsedjson = null;

		if (sevenDayAgoQf.length == 0) sevenDayAgoQf.push({ name : `**今日Ranked予定の${mode}譜面はありません**`, value : `チェック日時: ${now.getFullYear()}年 ${now.getMonth() + 1}月 ${now.getDate()}日 ${Utils.formatNumber(now.getHours())}:${Utils.formatNumber(now.getMinutes())}` });

		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉Daily Ranked Check🎉` })
			.setTitle(`日付が変わりました！今日Ranked予定の${mode}マップのリストです！`)
			.addFields(sevenDayAgoQf)
			.setFooter({ text: `このメッセージは毎日0時に送信されます。既にRankedされた譜面は表示されません。` });
		let MapcheckChannels = fs.readJsonSync(`./ServerDatas/MapcheckChannels.json`);
		for (const element of MapcheckChannels.Qualified[mode]) {
			try {
				if (client.channels.cache?.get(element) == undefined) continue;
				await client.channels.cache.get(element).send({ embeds: [embed] });
			} catch {
				continue;
			}
		}
		MapcheckChannels = null;
	}
}

async function makeBackup() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const day = now.getDate();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const dateString = `${year}-${month}-${day} ${hours} ${minutes}`;
	fs.mkdirSync(`./Backups/${dateString}`);
	fs.copySync("./ServerDatas", `./Backups/${dateString}`);
}

client.login(token);
