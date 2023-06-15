//require library
const { Client, Intents, MessageEmbed } = require("discord.js");
require('dotenv').config();
const fs = require("fs");
const tools = require("osu-api-extended");
const axios = require("axios");
const path = require('path');

//requireFIle
const { calculateSR, calculateSRwithacc } = require("./CalculateSR/CalculateSRPP");
const { modeconvert } = require("./Mode/Mode");
const { getMapInfo, mapstatus, getMapforRecent, getMapInfowithoutmods } = require("./GetmapInfo/GetMapInfo");
const { GetMapScore } = require("./GetmapInfo/GetMapScore");
const { Recentplay } = require("./GetmapInfo/GetRecentScore");
const { parseModString, parseMods, splitString } = require("./Modsconvert/Mods");
const { getplayersdata, getplayerscore } = require("./GetUser/userplays");
const { numDigits } = require("./numDigit/numDigit");
const { ODscaled } = require("./OD/ODscaled");
const { getOsuBeatmapFile, checkStream } = require("./Streamcheck/Streamcheck");
const { checkFileExists } = require("./Checkuser/CheckUser");

//apikeys
const apikey = process.env.APIKEY;
const token = process.env.TOKEN;
const appid = process.env.APPID;

//discord.js require Intents
const client = new Client({ intents: Intents.ALL });

//ready to use
client.on("ready", () => {
    console.log(`Success Logged in to ほしのBot V1.0.0`);
    client.user.setActivity('いろんなbotの機能')
	}
);

//casino symbols
const symbols = ['🍒', '🍊', '🍇', '🔔', '💰', '⌚', '⛵'];

//Use command

client.on("message", async(message) =>
	{
		//casino bot
		if (message.content.startsWith("/slot")) {
			try{
				let betAmount = message.content.split(" ")[1];
				if(betAmount < 0){
					message.reply("^^;");
					return;
				};
				if(betAmount == undefined){
					message.reply("Pls provide BedAmount");
					return;
				};
				if(/\D/.test(betAmount)){
					message.reply("Non-numeric input in Betamount. Please enter only numbers!");
					return;
				};
				betAmount = BigInt(betAmount);
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBalance = currentBalance - betAmount;
				if (newBalance <= 0n){
					message.reply(`You can't bet! Your bank will be <= 0(${newBalance.toLocaleString()})`);
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBalance.toString(), 'utf-8');
				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier;
				let resultprefix;
				let prefix = reward - betAmount;
				if(prefix >= 0n){
					resultprefix = "+";
				}else{
					resultprefix = "";
				};
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${reward.toLocaleString()}coin (${resultprefix}${(reward - betAmount).toLocaleString()})`);
				let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBankBalance = newcurrentBalance + reward;
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBankBalance.toString().replace("n", ""), 'utf-8');
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if (message.content.startsWith("/safeslot")) {
			try{
				let betAmount = message.content.split(" ")[1];
				if(betAmount < 0){
					message.reply("^^;");
					return;
				};
				if(betAmount == undefined){
					message.reply("Pls provide BedAmount");
					return;
				};
				if(/\D/.test(betAmount)){
					message.reply("Non-numeric input in Betamount. Please enter only numbers!");
					return;
				};
				betAmount = BigInt(betAmount);
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBalance = currentBalance - betAmount;
				if (newBalance <= 0n){
					message.reply(`You can't bet! Your bank will be <= 0(${newBalance.toLocaleString()})`);
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBalance.toString(), 'utf-8');
				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				let reward;
				if(rewardMultiplier == 0n){
					reward = betAmount * 2n * 10n / 100n;
				}else{
					reward = betAmount * rewardMultiplier * 7n * 10n / 100n;
				};
				let resultprefix;
				let prefix = reward - betAmount;
				if(prefix >= 0n){
					resultprefix = "+";
				}else{
					resultprefix = "";
				};
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${reward.toLocaleString()}coin (${resultprefix}${(reward - betAmount).toLocaleString()})`);
				let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBankBalance = newcurrentBalance + reward;
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBankBalance.toString().replace("n", ""), 'utf-8');
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/bankranking"){
			try{
				const folderPath = './Player Bank';
				const fileNamePattern = /^(.+)\.txt$/;
				const files = fs.readdirSync(folderPath);
				const userAmounts = {};
				files.forEach(file =>
					{
						const filePath = path.join(folderPath, file);
						const match = fileNamePattern.exec(file);
						if(match){
							const username = match[1];
							const fileContent = fs.readFileSync(filePath, 'utf8');
							const amount = fileContent.trim();
							userAmounts[username] = amount;
						};
					}
				);
				const sortedUserAmounts = Object.entries(userAmounts).sort((a, b) => b[1] - a[1]);
				let ranking = [];
				for(let i = 0; i < sortedUserAmounts.length; i++){
					const rank = i + 1;
					const username = sortedUserAmounts[i][0];
					ranking.push(`- __#**${rank}**__: **${username}**`);
				};
				message.channel.send(`__**Current Bank balance Ranking**__\n${ranking.join('\n')}`);
			}catch(e){
				console.log(e);
				message.reply("ランキング作成中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/lv"){
			try{
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				const messageuserbalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				let currentrank = 0;
				let nextbalance = 0n;
				for (let i = 1n ; i <= 300n; i += 1n){
					if(messageuserbalance / BigInt(120n ** i) < 1n && currentrank == 0){
						message.reply("Your rank could not be calculated because it is below 0");
						return;
					}
					if(messageuserbalance / BigInt(120n ** i) >= 1n){
						currentrank += 1;
						nextbalance = BigInt(120n ** (i + 1n));
					}
				}
				message.reply(`Your current level is **__${currentrank}lv__** / 300 (Next level => **${nextbalance}**coins)`);
				return;
			}catch(e){
				console.log(e);
				message.reply("レベル取得中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/recoshot"){
			try{
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				const userbank = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				if(userbank <= 100000000000000000000000000000000000n){
					message.reply("It appears you do not have the necessary amount of money to use this command. Please come back and earn some money! You need 1000溝 coins to use it!");
					return;
				};
				if(userbank <= 0){
					message.reply("You do not seem to have enough money to do the math. Please get someone else to give it to you or earn it!");
					return;
				};
				const recommend = (userbank / 15n).toString().replace("n", "");
				let betAmount = recommend;
				betAmount = BigInt(betAmount);
				let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBalance = currentBalance - betAmount;
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBalance.toString(), 'utf-8');
				const result = generateSlotResult();
				const rewardMultiplier = evaluateSlotResult(result);
				const reward = betAmount * rewardMultiplier * 8n * 10n / 100n;
				let resultprefix;
				let prefix = reward - betAmount;
				if(prefix >= 0n){
					resultprefix = "+";
				}else{
					resultprefix = "";
				};
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${reward.toLocaleString()}coin (${resultprefix}${(reward - betAmount).toLocaleString()})`);
				let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBankBalance = newcurrentBalance + reward;
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newBankBalance.toString().replace("n", ""), 'utf-8');
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/reco"){
			try{
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				const userbank = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				if(userbank <= 0){
					message.reply("You do not seem to have enough money to do the math. Please get someone else to give it to you or earn it!");
					return;
				};
				const recommend = (userbank / 15n).toString().replace("n", "");
				message.reply(`Recommend command: /slot ${recommend}`);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content === "/bank"){
			try{
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`)
				if(!truefalseuser) {
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				const currentbank = fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8');
				message.reply(`${message.author.username}'s Bank Current Balance \n ${BigInt(currentbank).toLocaleString()}(${toJPUnit(currentbank)}) coins`);
			}catch(e){
				console.log(e);
				message.reply("銀行残高の取得中にエラーが発生しました。");
				return;
			};
		};

		if(message.content.startsWith("/amount")){
			try{
				const amount = message.content.split(" ")[1];
				if(/\D/.test(amount)){
					message.reply("Non-numeric input in Betamound. Please enter only numbers!");
					return;
				};
				message.reply(`${toJPUnit(amount)}`);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content === "/reg"){
			try {
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(truefalseuser) {
					message.reply("You already register to this casino!");
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, "1000000", "utf-8");
				message.reply(`Welcome to Casio ${message.author.username}! 1000000 coin here!`);
			}catch(e){
				console.log(e);
				message.reply("ユーザー登録中にエラーが発生しました。");
				return;
			};
		};

		if(message.content.startsWith("/send")){
			try{
				const sentusername = message.content.split(" ")[1];
				if(sentusername == message.author.username){
					message.reply("You can't send to yourself!");
					return;
				};
				if(sentusername === undefined){
					message.reply("Pls provide user you want to send coin");
					return;
				};
				const truefalsesentuser = await checkFileExists(`./Player Bank/${sentusername}.txt`);
				if(!truefalsesentuser){
					message.reply(`${sentusername} doesn't register to this casino! type \`/reg\` to register!`);
					return;
				};
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser){
					message.reply("You didn't register to this casino! type `/reg` to register!");
					return;
				};
				let sentmoney = message.content.split(" ")[2];
				if(sentmoney === undefined){
					message.reply("Pls provide coins you want to send");
					return;
				};
				if(/\D/.test(sentmoney)){
					message.reply("Non-numeric input in Betamound. Please enter only numbers!");
					return;
				};
				sentmoney = BigInt(sentmoney);
				if(sentmoney < 0n){
					message.reply("^^;");
					fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, "0", 'utf-8');
					return;
				};
				const messagercurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newmessagerbankbalance = messagercurrentBalance - sentmoney;
				if(newmessagerbankbalance < 0n){
					message.reply(`You can't send! Your bank will be < 0(${newmessagerbankbalance})`);
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newmessagerbankbalance.toString(), 'utf-8');
				const sentusercurrentbalance = BigInt(fs.readFileSync(`./Player Bank/${sentusername}.txt`, 'utf-8'));
				const newsentusercurrentbalance = sentusercurrentbalance + sentmoney;
				fs.writeFileSync(`./Player Bank/${sentusername}.txt`, newsentusercurrentbalance.toString().replace("n", ""), 'utf-8');
				message.reply("Sended!");
			}catch(e){
				console.log(e);
				message.reply("送金処理中にエラーが発生しました。");
			};
		};

		//Furry Bot
		if(message.content.startsWith("/kemo")){
			if(message.author.bot) return;
			try{
				const text = fs.readFileSync(`./Furry/Furry.txt`, 'utf-8');
				const lines = text.split(" ");
				const lineCount = lines.length -1;
				const randomLineNumber = Math.floor(Math.random() * lineCount);
				const randomLine = lines[randomLineNumber];
				message.channel.send(randomLine);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。");
				return;
			};
		};

		if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.endsWith('.avi') || attachment.url.endsWith('.mov') || attachment.url.endsWith('.mp4') || attachment.url.endsWith('.png') || attachment.url.endsWith('.jpg') || attachment.url.endsWith('.gif')) && message.channel.id == "1106519942058229784") {
			if(message.author.bot) return;
			const attachment = message.attachments.first();
			const imageURL = attachment.url;
			try{
				fs.appendFile(`./Furry/Furry.txt`, `${imageURL} `, function (err){
					if(err) throw err;
				});
				message.reply(`Furry saved!`);
			}catch(e){
				console.log(e);
				message.reply("ファイルの保存中にエラーが発生しました。");
				return;
			};
		};

		if(message.content.startsWith("!delete")){
			if (message.author.bot) return;
			try{
				if(message.content == "!delete"){
					message.reply("削除したいリンクを一緒に貼り付けてください");
					return;
				};
				if(!message.content.split(" ")[0] == "!delete"){
					message.reply("!deleteとリンクの間には空白を入れてくださいね。");
					return;
				};
				const wannadelete = message.content.split(" ")[1];
				removeStringFromFile(`${wannadelete} `);
				message.reply("削除しました");
			}catch(e){
				console.log(e);
				message.reply("ファイルの削除中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "!count"){
			try {
				const text = fs.readFileSync(`./Furry/Furry.txt`, 'utf-8');
				const lines = text.split(" ");
				const lineCount = lines.length -1;
				message.channel.send(`今まで追加した画像や映像、gifの合計枚数は${lineCount}枚です。`);
			}catch(e){
				console.error(e);
				message.channel.send('ファイルを読み込む際にエラーが発生しました。');
				return;
			};
		};

		//Ohuzake bot
		if(message.content.startsWith("!kunii")){
			const kuniicontent = message.content.split(" ")[1]
			if(kuniicontent == "うんこえろしね"){
				message.reply("しんこうろえね");
				return;
			};
			if(kuniicontent === undefined){
				message.reply("できないからやばい");
				return;
			};
			const url = "https://labs.goo.ne.jp/api/morph";
			const params = {
				app_id: appid,
				sentence: kuniicontent
			};
			const data = await axios.post(url, params)
			.then((response) =>
				{
					return response.data.word_list
				}
			).catch((error) =>
				{
					console.log(error);
					message.reply("コマンド処理中になんらかのエラーが発生しました。");
				}
			);
			if(data[0].length == undefined || data[0].length == 0 || data[0].length == 1 || data[0].length > 4){
				message.channel.send("できないからやばい");
				return;
			}else if(data[0].length == 2){
				const data1 = data[0][0][0];
				const data2 = data[0][1][0];
				const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1);
				message.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`);
				return;
			}else if(data[0].length == 3){
				const data1 = data[0][0][0];
				const data2 = data[0][1][0];
				const data3 = data[0][2][0];
				const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1) + data3;
				message.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`);
				return;
			}else if(data[0].length == 4){
				const data1 = data[0][0][0];
				const data2 = data[0][1][0];
				const data3 = data[0][2][0];
				const data4 = data[0][3][0];
				const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1) + data4.charAt(0) + data3.slice(1) + data3.charAt(0) + data4.slice(1);
				message.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`);
				return;
			};
		};

		if(message.content == "うん"){
			message.channel.send("こ");
			return;
		}else if(message.content == "おい"){
			message.channel.send("電話だ");
			return;
		}else if(message.content.endsWith("ぞ？")){
			message.channel.send("で　ん　わ　で");
			return;
		}else if(message.content == "死ね" || message.content == "しね" || message.content == "死ねよ" || message.content == "しねよ"){
			message.channel.send("いきる");
			return;
		}else if(message.content.endsWith("しらねぇよ")){
			message.channel.send("知らねえじゃねえ！！！");
			return;
		}else if(message.content == "ごま"){
			message.channel.send("まいご");
			return;
		}else if(message.content == "やばい"){
			message.channel.send("やばいからやばい");
			return;
		};

		//NexusBot
		if(message.content.startsWith("!map")){
			try{
				if(message.content == "!map"){
					message.reply("How to use: !map <Maplink> <Mods(optional)> <Acc(optional)>");
					return;
				}else{
					const MessageMaplink = message.content.split(" ")[1];
					let arg2;
					let arg3;
					if(/^[a-zA-Z]+$/.test(message.content.split(" ")[2])){
						arg2 = "mod";
					}else if(/^[\d.]+$/g.test(message.content.split(" ")[2])){
						arg2 = "acc";
					}else{
						arg2 = "nothing";
					};
					if(/^[\d.]+$/g.test(message.content.split(" ")[3])){
						arg3 = "acc";
					}else{
						arg3 = "nothing";
					};
					let Mods = [];
					if(arg2 == "nothing"){
						Mods.push("NM");
					}else if(arg2 == "mod"){
						Mods = [message.content.split(" ")[2].toUpperCase()];
						Mods = splitString(Mods);
						if((Mods.includes("NC") && Mods.includes("HT")) || (Mods.includes("DT") && Mods.includes("HT"))){
							message.reply("It seems that the calculator does not calculate well with the combination of these mods.");
							return;
						};
						if (Mods.includes("NC")) {
							Mods.push("DT");
							let modsnotNC = Mods.filter((item) => /NC/.exec(item) == null);
							Mods = modsnotNC;
						};
					};
					const MapInfo = await getMapInfo(MessageMaplink, apikey, Mods);
					let BPM = MapInfo.bpm;
					if(Mods.includes("DT")){
						BPM *= 1.5;
					}else if(Mods.includes("HT")){
						BPM *= 0.75;
					};
					const mapperdata = await getplayersdata(apikey, MapInfo.mapper);
					const Modsconverted = parseModString(Mods);
					const srpps = await calculateSR(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode));
					const Mapstatus = mapstatus(MapInfo.approved);
					let lengthsec;
					if(numDigits(parseFloat(MapInfo.lengthsec.toFixed(0))) == 1){
						lengthsec = ('00' + MapInfo.lengthsec.toString()).slice(-2);
					}else{
						lengthsec = parseFloat(MapInfo.lengthsec.toString()).toFixed(0);
					};
					for(let i = 0; i < 4; i++){
						const value = parseFloat(srpps['S' + i]).toFixed(2);
						const numDigits = value.length;
						let result = '';
						if (numDigits >= 7) {
							result = `  ${value} `;
						} else if (numDigits == 6) {
							result = `  ${value}  `;
						} else if (numDigits == 5) {
							result = `  ${value}   `;
						} else if (numDigits == 4) {
							result = `   ${value}   `;
						};
						srpps['S' + i] = result;
					};
					let Showonlymods = [];
					if(arg2 == "mod"){
						Showonlymods = message.content.split(" ")[2].toUpperCase();
					}else{
						Showonlymods.push("NM");
					};
					let od = ODscaled(MapInfo.od, Mods);
					const maplembed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${MapInfo.artist} - ${MapInfo.title}`)
					.setURL(MapInfo.maplink)
					.addField("Music and Backgroud",`:musical_note:[Song Preview](https://b.ppy.sh/preview/${MapInfo.beatmapset_id}.mp3) :frame_photo:[Full background](https://assets.ppy.sh/beatmaps/${MapInfo.beatmapset_id}/covers/raw.jpg)`)
					.setAuthor(`Created by ${MapInfo.mapper}`, mapperdata.iconurl, mapperdata.playerurl)
					.addField(`[**__${MapInfo.version}__**] **+${Showonlymods}**`, `Combo: \`${MapInfo.combo}\` Stars: \`${srpps.sr}\` \n Length: \`${MapInfo.lengthmin}:${lengthsec}\` BPM: \`${BPM}\` Objects: \`${MapInfo.combo}\` \n CS: \`${MapInfo.cs}\` AR: \`${MapInfo.ar}\` OD: \`${od.toFixed(1)}\` HP: \`${MapInfo.hp}\` Spinners: \`${MapInfo.countspinner}\``, true)
					.addField("**Download**", `[Official](https://osu.ppy.sh/beatmapsets/${MapInfo.beatmapset_id}/download)\n[Nerinyan(no video)](https://api.nerinyan.moe/d/${MapInfo.beatmapset_id}?nv=1)\n[Beatconnect](https://beatconnect.io/b/${MapInfo.beatmapset_id})\n[chimu.moe](https://api.chimu.moe/v1/download/${MapInfo.beatmapset_id}?n=1)`, true)
					.addField(`:heart: ${MapInfo.favouritecount} :play_pause: ${MapInfo.playcount}`,`\`\`\` Acc |    98%   |    99%   |   99.5%  |   100%   | \n ----+----------+----------+----------+----------+  \n  PP |${srpps.S3}|${srpps.S2}|${srpps.S1}|${srpps.S0}|\`\`\``, false)
					.setImage(`https://assets.ppy.sh/beatmaps/${MapInfo.beatmapset_id}/covers/cover.jpg`)
					.setFooter(`${Mapstatus} mapset of ${MapInfo.mapper}`)
					message.channel.send(maplembed);
					if(arg2 == "acc"){
						let accpp = await calculateSRwithacc(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode), parseFloat(message.content.split(" ")[2]), 0,  MapInfo.combo);
						message.reply(`If you get **${message.content.split(" ")[2]}%** with **${Showonlymods}**, you will get __**${accpp.ppwithacc}pp**__`);
					}else if(arg3 == "acc"){
						let accpp = await calculateSRwithacc(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode), parseFloat(message.content.split(" ")[3]), 0,  MapInfo.combo);
						message.reply(`If you get **${message.content.split(" ")[3]}%** with **${Showonlymods}**, you will get __**${accpp.ppwithacc}pp**__`);
					};
				};
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!ro")){
			try{
				let playername;
				if(message.content.split(" ")[1] === undefined){
					try{
						let username = message.author.username;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername === undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 0);
				if(recentplay == 0){
					message.reply("No records found for this player within 24 hours");
					return;
				};
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);
				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);
				const acc = tools.tools.accuracy({300: recentplay.count300.toFixed(0), 100: recentplay.count100.toFixed(0), 50: recentplay.count50.toFixed(0), 0: recentplay.countmiss.toFixed(0), geki: recentplay.countgeki.toFixed(0), katu: recentplay.countkatu.toFixed(0)}, "osu");
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if(mods.includes("NC")){
					let modsnotNC = mods.filter((item) => item.match("NC") == null);
					mods = modsnotNC;
					modsforcalc = parseModString(mods);
					BPM *= 1.5;
				}else if(mods.includes("HT")){
					BPM *= 0.75;
				}
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if (recentplay.countmiss == 0) {
					ifFC100 = recentplay.count100 + recentplay.count50;
				}else{
					ifFC100 = recentplay.count100 + recentplay.countmiss + recentplay.count50;
				};
				let ifFC300;
				if(recentplay.countmiss > "0"){
					ifFC300 = GetMapInfo.combo + recentplay.count100  - recentplay.countmiss;
				}else{
					ifFC300 = GetMapInfo.combo - recentplay.count300 + recentplay.count100 + recentplay.count300;
				};
				const ifFCacc = tools.tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: "0", 0: "0", geki: "0", katu: "0"}, "osu");
				const Mapstatus = mapstatus(GetMapInfo.approved);
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, parseInt(recentplay.countmiss), parseInt(recentplay.maxcombo));
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, parseInt(GetMapInfo.combo));
				let lengthsec;
				if(numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1){
					lengthsec = ('00' + GetMapInfo.lengthsec).slice(-2);
				}else{
					lengthsec = GetMapInfo.lengthsec;
				};
				if(modforresult.includes("DT") && modforresult.includes("NC")){
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null);
					modforresult = modsnotDT;
				};
				let odscaled = ODscaled(GetMapInfo.od, mods);
				if(modforresult.length == 0){
					modforresult.push("NM");
				};
				const embed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`,playersdata.iconurl,playersdata.playerurl)
					.addField("`Grade`", `**${recentplay.rank}** + ${modforresult.join("")}`, true)
					.addField("`Score`", recentplay.score, true)
					.addField("`Acc`", `${acc}%`, true)
					.addField("`PP`", `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Combo`",`${recentplay.maxcombo}x / ${GetMapInfo.combo}x`,true)
					.addField("`Hits`",`{${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`,true)
					.addField("`If FC`", `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Acc`", `${ifFCacc}%`, true)
					.addField("`Hits`", `{${ifFC300}/${ifFC100}/0}`, true)
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter(`${Mapstatus} mapset of ${GetMapInfo.mapper}`, mappersdata.iconurl);
					await message.channel.send(embed).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, playersdata.iconurl,playersdata.playerurl)
								.addField("`Result`",`**${recentplay.rank}** + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, true)
								sentMessage.edit(embednew)
							}, 20000
						)
					}
				);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!rt")){
			try {
				let playername;
				if(message.content.split(" ")[1] === undefined){
					try{
						let username = message.author.username;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername === undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 1);
				if(recentplay == 0){
					message.reply("No records found for this player within 24 hours");
					return;
				};
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);
				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);
				const acc = tools.tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "taiko");
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if(mods.includes("NC")){
					let modsnotNC = mods.filter((item) => item.match("NC") == null);
					mods = modsnotNC;
					modsforcalc = parseModString(mods);
					BPM *= 1.5;
				}else if(mods.includes("HT")){
					BPM *= 0.75;
				};
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if(recentplay.countmiss == 0){
					ifFC100 = recentplay.count100;
				}else{
					ifFC100 = recentplay.count100 + recentplay.countmiss;
				};
				let ifFC300;
				if(recentplay.countmiss == 0){
					ifFC300 = GetMapInfo.combo - recentplay.count100;
				}else{
					ifFC300 = GetMapInfo.combo - recentplay.count100 - recentplay.countmiss;
				};
				const ifFCacc = tools.tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: "0", 0: "0", geki: "0", katu: "0"}, "taiko");
				const percentage = ((recentplay.totalhitcount / GetMapInfo.combo) * 100).toFixed(0);
				const Mapstatus = mapstatus(GetMapInfo.approved);
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);
				let lengthsec;
				if(numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1){
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2);
				}else{
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0);
				};
				if(modforresult.includes("DT") && modforresult.includes("NC")){
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null);
					modforresult = modsnotDT;
				};
				let odscaled = ODscaled(GetMapInfo.od, mods);
				if(modforresult.length == 0){
					modforresult.push("NM");
				};
				const embed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`,playersdata.iconurl,playersdata.playerurl)
					.addField("`Grade`", `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, true)
					.addField("`Score`", recentplay.score, true)
					.addField("`Acc`", `${acc}%`, true)
					.addField("`PP`", `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Combo`",`${recentplay.maxcombo}x / ${GetMapInfo.combo}x`,true)
					.addField("`Hits`",`{${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`,true)
					.addField("`If FC`", `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Acc`", `${ifFCacc}%`, true)
					.addField("`Hits`", `{${ifFC300}/${ifFC100}/0}`, true)
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter(`${Mapstatus} mapset of ${GetMapInfo.mapper}`, mappersdata.iconurl);
					await message.channel.send(embed).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, playersdata.iconurl,playersdata.playerurl)
								.addField("`Result`",`**${recentplay.rank}** (**${percentage}%**) + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${parseFloat(recentpp.ppwithacc).toFixed(2)}** / ${iffcpp.SSPP} [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]  {${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, true)
								sentMessage.edit(embednew)
							}, 20000
						)
					}
				);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!rc")){
			try {
				let playername;
				if(message.content.split(" ")[1] === undefined){
					try{
						let username = message.author.username;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername === undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 2);
				if(recentplay == 0){
					message.reply("No records found for this player within 24 hours");
					return;
				};
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);
				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);
				const acc = tools.tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "fruits")
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if(mods.includes("NC")){
					let modsnotNC = mods.filter((item) => item.match("NC") == null);
					mods = modsnotNC;
					modsforcalc = parseModString(mods);
					BPM *= 1.5;
				}else if(mods.includes("HT")){
					BPM *= 0.75;
				};
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if(recentplay.countmiss == 0){
					ifFC100 = recentplay.count100;
				}else{
					ifFC100 = recentplay.count100 + recentplay.countmiss;
				};
				let ifFC50;
				if(recentplay.countkatu == 0){
					ifFC50 = recentplay.count50;
				}else{
					ifFC50 = recentplay.count50 + recentplay.countkatu;
				};
				let ifFC300;
				if(recentplay.countmiss == 0){
					ifFC300 = GetMapInfo.combo - recentplay.count100;
				}else{
					ifFC300 = GetMapInfo.combo - recentplay.count100 - recentplay.countmiss;
				};
				const ifFCacc = tools.tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: ifFC50.toString(), 0: "0", geki: "0", katu: "0"}, "fruits");
				const percentage = parseFloat(((recentplay.count300 + recentplay.count100 + recentplay.count50 + recentplay.countmiss + recentplay.countkatu + recentplay.countgeki) / GetMapInfo.combo) * 100).toFixed(0);
				const Mapstatus = mapstatus(GetMapInfo.approved);
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);
				let lengthsec;
				if (numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1){
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2);
				}else{
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0);
				};
				if(modforresult.includes("DT") && modforresult.includes("NC")){
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null);
					modforresult = modsnotDT;
				};
				let odscaled = ODscaled(GetMapInfo.od, mods);
				if(modforresult.length === 0){
					modforresult.push("NM");
				};
				const embed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`,playersdata.iconurl,playersdata.playerurl)
					.addField("`Grade`", `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, true)
					.addField("`Score`", recentplay.score, true)
					.addField("`Acc`", `${acc}%`, true)
					.addField("`PP`", `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Combo`",`${recentplay.maxcombo}x / ${GetMapInfo.combo}x`,true)
					.addField("`Hits`",`{${recentplay.count300}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`,true)
					.addField("`If FC`", `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Acc`", `${ifFCacc}%`, true)
					.addField("`Hits`", `{${ifFC300}/${ifFC100}/${ifFC50}/0}`, true)
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter(`${Mapstatus} mapset of ${GetMapInfo.mapper}`, mappersdata.iconurl);
					await message.channel.send(embed).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, playersdata.iconurl,playersdata.playerurl)
								.addField("`Result`",`**${recentplay.rank}** (**${percentage}%**) + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recentplay.count300}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, true)
								sentMessage.edit(embednew)
							}, 20000
						)
					}
				);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!rm")){
			try {
				let playername;
				if(message.content.split(" ")[1] === undefined){
					try{
						let username = message.author.username;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername === undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 3);
				if(recentplay == 0){
					message.reply("No records found for this player within 24 hours");
					return;
				};
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);
				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);
				const acc = tools.tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "mania")
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if(mods.includes("NC")){
					let modsnotNC = mods.filter((item) => item.match("NC") == null);
					mods = modsnotNC;
					modsforcalc = parseModString(mods)
					BPM *= 1.5
				}else if(mods.includes("HT")){
					BPM *= 0.75;
				};
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode))
				let ifFC100;
				if(recentplay.countmiss == 0){
					ifFC100 = recentplay.count100;
				}else{
					ifFC100 = recentplay.count100 + recentplay.countmiss;
				};
				let ifFC50 = recentplay.count50;
				let ifFC200;
				if(recentplay.countmiss == 0){
					ifFC200 = recentplay.countkatu;
				}else{
					ifFC200 = recentplay.countkatu + recentplay.countmiss;
				};
				let ifFC300;
				if(recentplay.countmiss == 0){
					ifFC300 = GetMapInfo.combo - recentplay.countkatu - recentplay.count100 - recentplay.count50;
				}else{
					ifFC300 = GetMapInfo.combo - recentplay.countkatu - recentplay.count100 - recentplay.count50 - recentplay.countmiss;
				};
				const ifFCacc = tools.tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: ifFC50.toString(), 0: "0", geki: "0", katu: ifFC200.toString()}, "mania");
				const percentage = parseFloat(((recentplay.count300 + recentplay.count100 + recentplay.count50 + recentplay.countmiss + recentplay.countkatu + recentplay.countgeki) / GetMapInfo.combo) * 100).toFixed(0);
				const Mapstatus = mapstatus(GetMapInfo.approved);
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);
				let lengthsec
				if(numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1){
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2);
				}else{
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0);
				};
				if(modforresult.includes("DT") && modforresult.includes("NC")){
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null);
					modforresult = modsnotDT;
				};
				let odscaled = ODscaled(GetMapInfo.od, mods);
				if(modforresult.length === 0){
					modforresult.push("NM");
				};
				let recent300 = recentplay.count300 + recentplay.countgeki;
				const embed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`,playersdata.iconurl,playersdata.playerurl)
					.addField("`Grade`", `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, true)
					.addField("`Score`", recentplay.score, true)
					.addField("`Acc`", `${acc}%`, true)
					.addField("`PP`", `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Combo`",`${recentplay.maxcombo}x / ${GetMapInfo.combo}x`,true)
					.addField("`Hits`",`{${recent300}/${recentplay.countkatu}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`,true)
					.addField("`If FC`", `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Acc`", `${ifFCacc}%`, true)
					.addField("`Hits`", `{${ifFC300}/${ifFC100}/${ifFC50}/0}`, true)
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter(`${Mapstatus} mapset of ${GetMapInfo.mapper}`, mappersdata.iconurl);
					await message.channel.send(embed).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor(`${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, playersdata.iconurl,playersdata.playerurl)
								.addField("`Result`",`**${recentplay.rank}** (**${percentage}%**) + **${modforresult}**  **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recent300}/${recentplay.countkatu}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, true)
								sentMessage.edit(embednew)
							}, 20000
						)
					}
				);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if (message.content === "!r") {
			message.reply("How to use: !r(o, t, c, m) <Username(optional)>");
			return;
		};

		if (message.content.startsWith("!reg")) {
			if(message.content === "!reg"){
				message.reply("How to use: !reg <osu!username>");
				return;
			}else{
				const username = message.author.username;
				const osuid = message.content.split(" ")[1];
				console.log(`登録履歴 ${username}: ${osuid}`);
				try{
					fs.writeFileSync(`./Player infomation/${username}.txt`, osuid, "utf-8");
					message.reply(`${username} is saved as ${osuid}!`);
				}catch(e){
					console.log(e);
					message.reply("ユーザーを登録する際にエラーが発生しました。");
					return;
				};
			};
		};

		if(message.content.startsWith("!ispp")){
			try{
				if(message.content === "!ispp"){
					message.reply("How to use: !ispp <Maplink> <Mods(Optional)>")
				}else{
					const args = message.content.substring(4).split(/\s+/);
					let mods;
					let modsforcalc;
					if(args.slice(2).length == 0){
						mods = "NM";
						modsforcalc = 0;
					}else{
						mods = splitString(args.slice(2));
						if (mods.includes("NC")) {
							let modsnotDT = Mods.filter((item) => /NC/.exec(item) == null);
							modsnotDT.push("DT");
							modsforcalc = parseModString(modsnotDT);
						}else{
							modsforcalc = parseModString(mods);
						};
					};
					const maplink = message.content.split(" ")[1];
					let data = await getMapInfo(maplink, apikey, mods);
					let sr = await calculateSR(data.beatmapId, modsforcalc, modeconvert(data.mode));
					const Mapstatus = mapstatus(data.approved);
					const FP = parseFloat(sr.S0 / data.totallength * 100).toFixed(1);
					let FPmessage;
					let rankplayer;
					if(FP >= 700){
						FPmessage = "**This is SO GOOD PP map**";
					}else if(FP >= 400){
						FPmessage = "**This is PP map**";
					}else if(FP >= 200){
						FPmessage = "**This is PP map...?idk**";
					}else if(FP >= 100){
						FPmessage = "This is no PP map ;-;";
					}else{
						FPmessage = "This is no PP map ;-;";
					};
					if(sr.S0 >= 750){
						rankplayer = "**High rank player**";
					}else if(sr.S0 >= 500){
						rankplayer = "**Middle rank player**";
					}else if(sr.S0 >= 350){
						rankplayer = "**Funny map player**";
					}else{
						rankplayer = "**Beginner player**";
					};
					const ppdevidetotallength = (sr.S0 / data.totallength);
					const ppdevideparsefloat = parseFloat(ppdevidetotallength).toFixed(1);
					message.reply(`Totalpp : **${sr.S0}** (**${Mapstatus}**) | Farmscore : **${FP}** For ${rankplayer} | ${FPmessage} (${ppdevideparsefloat} pp/s)`);
				}
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if (message.content.startsWith("!lb")) {
			try{
				if(message.content === "!lb"){
					message.reply("How to use: !lb <Maplink> <Mods(Optional)>");
					return;
				}else{
					const maplink = message.content.split(" ")[1];
					const beatmapid = maplink.split("/")[5].split(" ")[0];
					const args = message.content.substring(4).split(/\s+/);
					let mods = [];
					if(args.slice(1).length === 0){
						mods.push("NM");
					}else{
						mods = splitString(args.slice(1).toUpperCase());
					};
					let modsnotNC = mods;
					if(mods.includes("NC")){
						mods.push("DT");
						modsnotNC = Mods.filter((item) => /NC/.exec(item) == null);
					};
					const Mapinfo = await getMapInfo(maplink, apikey, mods);
					const mapperinfo = await getplayersdata(apikey, Mapinfo.mapper, Mapinfo.mode);
					const mapsetlink = Mapinfo.maplink.split("/")[4].split("#")[0];
					let SR = await calculateSR(beatmapid, parseModString(modsnotNC), modeconvert(Mapinfo.mode));
					let BPM = Mapinfo.bpm;
					if(mods.includes('NC')){
						mods.push('DT');
					};
					if(mods.includes("NC") || mods.includes("DT")){
						BPM *= 1.5;
					}else if(mods.includes("HT")){
						BPM *= 0.75;
					};
					const resulttop5 = await GetMapScore(beatmapid, parseModString(mods), apikey, Mapinfo.mode);
					if (mods.includes("DT") && mods.includes("NC")) {
						let modsnotDT = Mods.filter((item) => /DT/.exec(item) == null);
						mods = modsnotDT;
					};
					let acc0;
					let acc1;
					let acc2;
					let acc3;
					let acc4;
					if(resulttop5.length === 5){
						acc0 = tools.tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode));
						acc1 = tools.tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode));
						acc2 = tools.tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode));
						acc3 = tools.tools.accuracy({300: resulttop5[3].count300, 100: resulttop5[3].count100, 50: resulttop5[3].count50, 0: resulttop5[3].countmiss, geki:  resulttop5[3].countgeki, katu: resulttop5[3].countkatu}, modeconvert(Mapinfo.mode));
						acc4 = tools.tools.accuracy({300: resulttop5[4].count300, 100: resulttop5[4].count100, 50: resulttop5[4].count50, 0: resulttop5[4].countmiss, geki:  resulttop5[4].countgeki, katu: resulttop5[4].countkatu}, modeconvert(Mapinfo.mode));
							const embed = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor(`Mapped by ${mapperinfo.username}`, mapperinfo.iconurl, `https://osu.ppy.sh/users/${mapperinfo.user_id}`)
								.addField("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
								.addField("\`#1\`", `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`,false)
								.addField("\`#2\`", `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`,false)
								.addField("\`#3\`", `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`,false)
								.addField("\`#4\`", `**Rank**: \`${resulttop5[3].rank}\` **Player**: \`${resulttop5[3].username}\` **Score**: ${resulttop5[3].score} \n [\`${resulttop5[3].maxcombo}\`combo] \`${acc3}\`% \`${resulttop5[3].pp}\`pp miss:${resulttop5[3].countmiss}`,false)
								.addField("\`#5\`", `**Rank**: \`${resulttop5[4].rank}\` **Player**: \`${resulttop5[4].username}\` **Score**: ${resulttop5[4].score} \n [\`${resulttop5[4].maxcombo}\`combo] \`${acc4}\`% \`${resulttop5[4].pp}\`pp miss:${resulttop5[4].countmiss}`,false)
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						message.channel.send(embed);
						return;
					}else if(resulttop5.length === 4){
						acc0 = tools.tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode));
						acc1 = tools.tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode));
						acc2 = tools.tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode));
						acc3 = tools.tools.accuracy({300: resulttop5[3].count300, 100: resulttop5[3].count100, 50: resulttop5[3].count50, 0: resulttop5[3].countmiss, geki:  resulttop5[3].countgeki, katu: resulttop5[3].countkatu}, modeconvert(Mapinfo.mode));
							const embed = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor(`Mapped by ${mapperinfo.username}`, mapperinfo.iconurl, `https://osu.ppy.sh/users/${mapperinfo.user_id}`)
								.addField("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
								.addField("\`#1\`", `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`,false)
								.addField("\`#2\`", `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`,false)
								.addField("\`#3\`", `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`,false)
								.addField("\`#4\`", `**Rank**: \`${resulttop5[3].rank}\` **Player**: \`${resulttop5[3].username}\` **Score**: ${resulttop5[3].score} \n [\`${resulttop5[3].maxcombo}\`combo] \`${acc3}\`% \`${resulttop5[3].pp}\`pp miss:${resulttop5[3].countmiss}`,false)
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						message.channel.send(embed)
						return;
					}else if(resulttop5.length === 3){
						acc0 = tools.tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode));
						acc1 = tools.tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode));
						acc2 = tools.tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode));
							const embed = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor(`Mapped by ${mapperinfo.username}`, mapperinfo.iconurl, `https://osu.ppy.sh/users/${mapperinfo.user_id}`)
								.addField("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
								.addField("\`#1\`", `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`,false)
								.addField("\`#2\`", `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`,false)
								.addField("\`#3\`", `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`,false)
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						message.channel.send(embed)
						return;
					}else if(resulttop5.length === 2){
						acc0 = tools.tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode));
						acc1 = tools.tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode));
							const embed = new MessageEmbed()
								.setColor("BLUE")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor(`Mapped by ${mapperinfo.username}`, mapperinfo.iconurl, `https://osu.ppy.sh/users/${mapperinfo.user_id}`)
								.addField("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
								.addField("\`#1\`", `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`,false)
								.addField("\`#2\`", `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`,false)
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						message.channel.send(embed)
						return;
					}else if(resulttop5.length === 1){
						acc0 = tools.tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode));
						const embed = new MessageEmbed()
							.setColor("BLUE")
							.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
							.setURL(maplink)
							.setAuthor(`Mapped by ${mapperinfo.username}`, mapperinfo.iconurl, `https://osu.ppy.sh/users/${mapperinfo.user_id}`)
							.addField("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
							.addField("\`#1\`", `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`,false)
							.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						message.channel.send(embed);
						return;
					}else{
						message.channel.send("No score found");
						return;
					};
				};
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content === "!help"){
			message.reply("How to use NexusBot commands \n 1: `!map <maplink> <mods(optional)> <acc(optional)>` You can get more information about the map. By adding mods to the command, you can see the SR, PP, and BPM when the mods are applied. \n 2:`!r<mode(o, t, c, m)> <username(optional)>` You can view the most recent your record for each mode. \n 3:`!reg <osu!username>` It will be possible to link Discord username to osu!username and omit usernames when sending commands(!rt command). \n 4:`!ispp <maplink> <mods(optional)>` It calculates the pp per song total time and tells you if it is efficient. \n 5:`!lb <maplink> <mods(optional)>` You can view the top 5 rankings by mods.\n 6:`!s <maplink> <username(optional)>` You can view your best score at the map.\n 7: `!check <maplink>` It show the map's max stream length!");
		};

		if(message.content.startsWith("!s")){
			try{
				if(message.content === "!s"){
					message.reply("How to use: !s <Maplink> <username(optional)>")
					return
				}
				let playername;
				if(message.content.split(" ")[2] === undefined){
					try{
						let username = message.author.username;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[2];
					if(playername == undefined){
						message.reply("メッセージからユーザー名を取得できませんでした。");
						return;
					};
				};
				const beatmapId = message.content.split("#")[1].split("/")[1].split(" ")[0];
				const maplink = message.content.split(" ")[1];
				const Mapinfo = await getMapInfowithoutmods(maplink, apikey);
				const playersscore = await getplayerscore(apikey, beatmapId, playername, Mapinfo.mode);
				if(playersscore == 0){
					message.reply("No score found. Is this convertmap? convertmap is incompatible!");
					return;
				};
				const Playersinfo = await getplayersdata(apikey, playername, Mapinfo.mode);
				const Mapperinfo = await getplayersdata(apikey, Mapinfo.mapper, Mapinfo.mode);
				const acc = tools.tools.accuracy({300: playersscore.count300.toString(), 100: playersscore.count100.toString(), 50: playersscore.count50.toString(), 0: playersscore.countmiss.toString(), geki : playersscore.countgeki.toString(), katu: playersscore.countgeki.toString()}, modeconvert(Mapinfo.mode));
				let stringmods = parseMods(playersscore.enabled_mods);
				if(stringmods.includes("DT") && stringmods.includes("NC")){
					let modsnotNC = stringmods.filter((item) => item.match("NC") == null);
					stringmods = modsnotNC;
				};
				const srpp = await calculateSRwithacc(beatmapId, parseModString(stringmods), modeconvert(Mapinfo.mode), acc, playersscore.countmiss, playersscore.maxcombo);
				let Hits;
				if(Mapinfo.mode == 0 || Mapinfo.mode == 1){
					Hits = `{${playersscore.count300}/${playersscore.count100}/${playersscore.countmiss}}`;
				}else if(Mapinfo.mode == 2){
					Hits = `{${playersscore.count300}/${playersscore.count100}/${playersscore.count50}/${playersscore.countmiss}}`;
				}else if(Mapinfo.mode == 3){
					let maniascore300 = parseInt(playersscore.count300) + parseInt(playersscore.countgeki);
					Hits `{${maniascore300}/${playersscore.countkatu}/${playersscore.count100}/${playersscore.count50}/${playersscore.countmiss}}`;
				};
				let showonlymods = parseMods(playersscore.enabled_mods);
				if(showonlymods.includes("DT") && showonlymods.includes("NC")){
					let modsnotDT = showonlymods.filter((item) => item.match("DT") == null);
					showonlymods = modsnotDT;
				}else if(showonlymods.length == 0){
					showonlymods.push("NM");
				};
				let bpm = Mapinfo.bpm;
				if (stringmods.includes("DT") || stringmods.includes("NC")){
					bpm *= 1.5;
				}else if(stringmods.includes("HT")){
					bpm *= 0.75;
				};
				const embed = new MessageEmbed()
					.setColor("BLUE")
					.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
					.setURL(maplink)
					.setAuthor(`Mapped by ${Mapinfo.mapper}`, Mapperinfo.iconurl, `https://osu.ppy.sh/users/${Mapperinfo.user_id}`)
					.addField("Player name",`[${playername}](https://osu.ppy.sh/users/${playername})`,true)
					.addField("SR", `\`★${srpp.sr}\``, true)
					.addField("BPM", `\`${bpm}\``, true)
					.addField("Rank", `\`${playersscore.rank}\``, true)
					.addField("Hits", Hits, true)
					.addField("Mods", `\`${showonlymods.join("")}\``, true)
					.addField("Accuracy", `\`${acc}%\``, true)
					.addField("PP", `**${srpp.ppwithacc}** / ${srpp.SSPP} `, true)
					.addField("Mirror Download link",`[Nerinyan](https://api.nerinyan.moe/d/${Mapinfo.beatmapset_id}?nv=1) \n [Beatconnect](https://beatconnect.io/b/${Mapinfo.beatmapset_id})`, true)
					.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
					.setFooter(`Played by ${playername}  #${Playersinfo.pp_rank} (${Playersinfo.country}${Playersinfo.pp_country_rank})`, Playersinfo.iconurl);
					message.channel.send(embed);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!check")){
			try{
				if(message.content == "!check"){
					message.reply("How to use: !check <Maplink>");
					return;
				};
				const beatmapId = message.content.split(" ")[1].split("/")[5];
				const bpm = await getMapInfowithoutmods(message.content.split(" ")[1], apikey);
				await getOsuBeatmapFile(beatmapId);
				const streamdata = await checkStream(beatmapId, bpm.bpm);
				await message.reply(`Streamlength: ${streamdata} `);
				try {
					fs.unlinkSync(`./BeatmapFolder/${beatmapId}.txt`);
				}catch(e){
					console.log(e);
					message.reply("Beatmapファイルを削除する際にエラーが発生しました。この事を開発者に報告してください。");
					return;
				};
			}catch(e){
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};
	}
);


//Casino bot function
function generateSlotResult() {
	const result = [];
	for(let i = 0; i < 3; i++){
		const randomIndex = Math.floor(Math.random() * symbols.length);
		result.push(symbols[randomIndex]);
	};
	return result;
}

function evaluateSlotResult(result) {
	if(result[0] === result[1] && result[1] === result[2]){
		return 30n;
	}else if(result[0] === result[1] || result[1] === result[2]){
		return 10n;
	}else if(result[0] === result[2]){
		return 5n;
	}else{
		return 0n;
	};
};

function toJPUnit(num){
	const str = num;
	if(str.length >= 216){
		const truncatedValue = parseFloat(str.slice(0, str.length - (str.length - 4))) / 1000;
		return "約" + truncatedValue + ` * 10^${str.length - 213}イカクンガ(+212桁)`;
	}else{
		let n = "";
		let count = 0;
		let ptr = 0;
		let kName = ["万","億","兆","京","垓","杼","穰","溝","澗","正","載","極","恒河沙","阿僧祇","那由他","不可思議","無量大数","無限超越数","無限超超越数","無限高次超越数","超限大数","超限超越大数","超限高次大数","超超限大数","超超限超越大数","超超限高次大数","超超超限大数","無辺数","無限大数","無限極数","無窮数","無限巨数","無涯数","無辺無数","無窮無数","無限超数","無辺超数","無尽数","無量超数","無辺絶数","無限絶数","イクカン","イガグン","レジギガス","イイググ","イガグググ","イカレジ","イカマニア","イガ","イグ","グイグイ","イクンカ","イカクンガ"];
		for (let i=str.length-1; i>=0; i--){
			n = str.charAt(i) + n;
			count++;
			if(((count % 4) == 0) && (i != 0)) n = kName[ptr++]+n;
		};
		return n;
	};
};

//Furry bot Function
function removeStringFromFile(stringToRemove) {
	return new Promise((resolve, reject) =>
		{
			fs.readFile('./Furry/Furry.txt', "utf8", (err, data) =>
				{
					if(err) reject(err);
					else {
						const updatedData = data.replace(new RegExp(stringToRemove, "g"), "");
						fs.writeFile('./Furry/Furry.txt', updatedData, (err) => {
							if (err) reject(err);
							else resolve();
							}
						);
					};
				}
			);
		}
	);
};

//discord bot login
client.login(token);
