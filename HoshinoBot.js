//require library
const { Client, Intents, MessageEmbed } = require("./node_modules/discord.js");
require('./node_modules/dotenv').config();
const fs = require("fs");
const tools = require("./node_modules/osu-api-extended");
const axios = require("./node_modules/axios");
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
				if(message.content == "/slot"){
					message.reply("使い方: /slot <賭け金額>");
					return;
				};
				let betAmount = message.content.split(" ")[1];
				if(betAmount == ""){
					message.reply("賭け金額の前の空白が1つ多い可能性があります。");
					return;
				};
				if(betAmount < 0){
					message.reply("賭け金額をマイナスにすることは出来ません。");
					return;
				};
				if(betAmount == undefined){
					message.reply("賭け金を入力してください。");
					return;
				};
				if(/\D/.test(betAmount)){
					message.reply("数字以外が賭け金額欄に入力されています。数字のみ入力するようにしてください。");
					return;
				};
				betAmount = BigInt(betAmount);
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBalance = currentBalance - betAmount;
				if (newBalance <= 0n){
					message.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`);
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
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);
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
				if(message.content == "/safeslot"){
					message.reply("使い方: /safeslot <賭け金額>");
					return;
				};
				let betAmount = message.content.split(" ")[1];
				if(betAmount == ""){
					message.reply("賭け金額の前の空白が1つ多い可能性があります。");
					return;
				};
				if(betAmount < 0){
					message.reply("^^;");
					return;
				};
				if(betAmount == undefined){
					message.reply("賭け金を入力してください。");
					return;
				};
				if(/\D/.test(betAmount)){
					message.reply("数字以外が賭け金額欄に入力されています。数字のみ入力するようにしてください。");
					return;
				};
				betAmount = BigInt(betAmount);
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser) {
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				const newBalance = currentBalance - betAmount;
				if (newBalance <= 0n){
					message.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`);
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
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);
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
							const fileContent = fs.readFileSync(filePath, 'utf8').length;
							userAmounts[username] = fileContent;
						};
					}
				);
				const sortedUserAmounts = Object.entries(userAmounts).sort((a, b) => b[1] - a[1]);
				let ranking = [];
				for(let i = 0; i < sortedUserAmounts.length; i++){
					const rank = i + 1;
					const username = sortedUserAmounts[i][0];
					ranking.push(`- __#**${rank}**__: **${username}** (__*${sortedUserAmounts[i][1]}桁*__)`);
				};
				message.channel.send(`__**Current Bank digits Ranking**__\n${ranking.join('\n')}`);
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
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				const messageuserbalance = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				let currentrank = 0;
				let nextbalance = 0n;
				for (let i = 1n ; i <= 300n; i += 1n){
					if(messageuserbalance / BigInt(120n ** i) < 1n && currentrank == 0){
						message.reply("あなたの現在のレベルは**__0lv__**以下です。");
						return;
					}
					if(messageuserbalance / BigInt(120n ** i) >= 1n){
						currentrank += 1;
						nextbalance = BigInt(120n ** (i + 1n));
					}
				}
				message.reply(`あなたの現在のレベルは **__${currentrank}lv__** / 300 (次のレベル => **${formatBigInt(nextbalance)}**coins)`);
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
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				const userbank = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				if(userbank <= 100000000000000000000000000000000000n){
					message.reply("このコマンドを使うには、1000溝以上のお金が銀行口座にある必要があります。");
					return;
				};
				if(userbank <= 0n){
					message.reply("賭け金額を計算できるほどのお金を持っていないようです。他人からもらうか、稼ぐかしてください。");
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
				message.channel.send(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);
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
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				const userbank = BigInt(fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8'));
				if(userbank <= 0){
					message.reply("賭け金額を計算できるほどのお金を持っていないようです。他人からもらうか、稼ぐかしてください。");
					return;
				};
				const recommend = (userbank / 15n).toString().replace("n", "");
				message.reply(`おすすめのslotコマンド: /slot ${recommend}`);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/bank"){
			try{
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`)
				if(!truefalseuser) {
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				const currentbank = fs.readFileSync(`./Player Bank/${message.author.username}.txt`, 'utf-8');
				message.reply(`${message.author.username}の現在の銀行口座残高: \n ${formatBigInt(currentbank)}(${toJPUnit(currentbank)}) coins`);
			}catch(e){
				console.log(e);
				message.reply("銀行残高の取得中にエラーが発生しました。");
				return;
			};
		};

		if(message.content.startsWith("/amount")){
			try{
				if(message.content == "/amount"){
					message.reply("使い方: /amount <確認したい金額>");
					return;
				};
				const amount = message.content.split(" ")[1];
				if(amount == ""){
					message.reply("金額の前の空白が1つ多い可能性があります。");
					return;
				};
				if(/\D/.test(amount)){
					message.reply("数字以外が金額入力欄に入力されています。数字のみ入力するようにしてください。");
					return;
				};
				message.reply(`${toJPUnit(amount)}`);
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			};
		};

		if(message.content == "/reg"){
			try {
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(truefalseuser) {
					message.reply("あなたはもう既にこのカジノに登録されています。");
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, "1000000", "utf-8");
				message.reply(`カジノへようこそ！ ${message.author.username}! 初回なので1000000コインを差し上げます。`);
			}catch(e){
				console.log(e);
				message.reply("ユーザー登録中にエラーが発生しました。");
				return;
			};
		};

		if(message.content.startsWith("/send")){
			try{
				if(message.content == "/send"){
					message.reply("使い方: /send <あげたい人> <金額>");
					return;
				};
				const sentusername = message.content.split(" ")[1];
				if(message.content.split(" ")[1] == ""){
					message.reply("送り先のユーザー名の前の空白が1つ多い可能性があります。");
					return;
				}
				if(sentusername == message.author.username){
					message.reply("自分自身に送ることは許されていません！");
					return;
				};
				if(sentusername == undefined){
					message.reply("送り先のユーザー名を入力してください。");
					return;
				};
				const truefalsesentuser = await checkFileExists(`./Player Bank/${sentusername}.txt`);
				if(!truefalsesentuser){
					message.reply(`${sentusername} というユーザーはこのカジノに登録されていません。/regで登録してもらってください。`);
					return;
				};
				const truefalseuser = await checkFileExists(`./Player Bank/${message.author.username}.txt`);
				if(!truefalseuser){
					message.reply("このカジノにユーザー登録されていないようです。`/reg`と入力して登録してください。");
					return;
				};
				let sentmoney = message.content.split(" ")[2];
				if(sentmoney == undefined){
					message.reply("送りたい希望金額を入力してください。");
					return;
				};
				if(sentmoney == ""){
					message.reply("送りたい希望金額の前の空白が1つ多い可能性があります。");
					return;
				};
				if(/\D/.test(sentmoney)){
					message.reply("数字以外が金額入力欄に入力されています。数字のみ入力するようにしてください。");
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
					message.reply(`この金額を送ることは出来ません。この金額を送った場合、あなたの銀行口座残高が0を下回ってしまいます。(${newmessagerbankbalance})`);
					return;
				};
				fs.writeFileSync(`./Player Bank/${message.author.username}.txt`, newmessagerbankbalance.toString(), 'utf-8');
				const sentusercurrentbalance = BigInt(fs.readFileSync(`./Player Bank/${sentusername}.txt`, 'utf-8'));
				const newsentusercurrentbalance = sentusercurrentbalance + sentmoney;
				fs.writeFileSync(`./Player Bank/${sentusername}.txt`, newsentusercurrentbalance.toString().replace("n", ""), 'utf-8');
				message.reply("送金が完了しました。");
			}catch(e){
				console.log(e);
				message.reply("送金処理中にエラーが発生しました。");
			};
		};

		if(message.content == "/dice"){
			message.reply(`サイコロを振った結果: **${Math.floor(Math.random() * 6) + 1}**`);
			return;
		};

		if(message.content == "/roulette"){
			const num = Math.floor(Math.random() * 2);
			if(num == 0){
				message.reply("ルーレットの結果: **赤**");
				return;
			}else if(num == 1){
				message.reply("ルーレットの結果: **黒**");
				return;
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
				message.reply(`Furryが保存されました`);
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
					message.reply("使い方: !delete <メディアリンク>");
					return;
				};
				if(!message.content.split(" ")[0] == "!delete"){
					message.reply("!deleteとリンクの間には空白を入れてください。");
					return;
				};
				const wannadelete = message.content.split(" ")[1];
				if(wannadelete == ""){
					message.reply("削除したいリンクの前の空白が1つ多い可能性があります。");
					return;
				};
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
				console.log(e);
				message.channel.send('ファイルを読み込む際にエラーが発生しました。');
				return;
			};
		};

		//Ohuzake bot
		if(message.content.startsWith("!kunii")){
			try{
				if(message.content == "!kunii"){
					message.reply("使い方: !kunii <変換したい文章>");
					return;
				};
				const kuniicontent = message.content.split(" ")[1]
				if(kuniicontent == ""){
					message.reply("変換したい文章の前の空白が1つ多い可能性があります。");
					return;
				};
				if(kuniicontent == "うんこえろしね"){
					message.reply("しんこうろえね");
					return;
				};
				if(kuniicontent == undefined){
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
				).catch((e) =>
					{
						console.log(e);
						message.reply("データ取得中になんらかのエラーが発生しました。");
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
				}
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中にエラーが発生しました。");
				return;
			}
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
					message.reply("使い方: !s <マップリンク> <Mods(省略可)> <Acc(省略可)>");
					return;
				};
				const MessageMaplink = message.content.split(" ")[1];
				if(MessageMaplink == ""){
					message.reply("マップリンクの前の空白が1つ多い可能性があります。");
					return;
				};
				if(MessageMaplink == undefined){
					message.reply("マップリンクを入力してください。");
					return;
				};
				let arg2;
				let arg3;
				if(message.content.split(" ")[2] == undefined){
					arg2 = "nothing";
				}else if(/^[a-zA-Z]+$/.test(message.content.split(" ")[2])){
					arg2 = "mod";
				}else if(/^[\d.]+$/g.test(message.content.split(" ")[2])){
					arg2 = "acc";
				}else if(message.content.split(" ")[2] == ""){
					message.reply("Mods, Acc欄の前に空白が一つ多い可能性があります。")
					return;
				}else{
					message.reply("Mods, Acc欄には数字かModのみを入力してください。")
					return;
				};
				if(message.content.split(" ")[3] == undefined){
					arg3 = "nothing"
				}else if(/^[\d.]+$/g.test(message.content.split(" ")[3])){
					arg3 = "acc";
				}else if(message.content.split(" ")[3] == ""){
					message.reply("Acc欄の前に空白が一つ多い可能性があります。")
					return;
				}else{
					message.reply("Acc欄には数字のみを入力してください。")
					return;
				};
				let Mods = [];
				if(arg2 == "nothing"){
					Mods.push("NM");
				}else if(arg2 == "mod"){
					Mods = [message.content.split(" ")[2].toUpperCase()];
					Mods = splitString(Mods);
					if(!checkStrings(Mods)){
						message.reply("入力されたModは存在しません。存在するModを指定するようにしてください。");
						return;
					};
					if((Mods.includes("NC") && Mods.includes("HT")) || (Mods.includes("DT") && Mods.includes("HT") || (Mods.includes("DT") && Mods.includes("NC")) || (Mods.includes("EZ") && Mods.includes("HR")) )){
						message.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
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
					message.reply(`**${Showonlymods}**で**${message.content.split(" ")[2]}%**を取った時のPPは__**${accpp.ppwithacc}pp**__です。`);
				}else if(arg3 == "acc"){
					let accpp = await calculateSRwithacc(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode), parseFloat(message.content.split(" ")[3]), 0,  MapInfo.combo);
					message.reply(`**${Showonlymods}**で**${message.content.split(" ")[3]}%**を取った時のPPは__**${accpp.ppwithacc}pp**__です。`);
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
				if(message.content.split(" ")[1] == undefined){
					try{
						let username = message.author.id;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername == undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					}else if(playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 0);
				if(recentplay == 0){
					message.reply(`${playername}さんには24時間以内にプレイしたosu!譜面がないようです。`);
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
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
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
				if(message.content.split(" ")[1] == undefined){
					try{
						let username = message.author.id;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername == undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					}else if(playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 1);
				if(recentplay == 0){
					message.reply(`${playername}さんには24時間以内にプレイしたTaiko譜面がないようです。`);
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
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
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
				if(message.content.split(" ")[1] == undefined){
					try{
						let username = message.author.id;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername == undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					}else if(playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 2);
				if(recentplay == 0){
					message.reply(`${playername}さんには24時間以内にプレイしたCatch譜面がないようです。`);
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
					.addField("`Hits`",`{${recentplay.count300}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`,true)
					.addField("`If FC`", `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, true)
					.addField("`Acc`", `${ifFCacc}%`, true)
					.addField("`Hits`", `{${ifFC300}/${ifFC100}/${ifFC50}/0}`, true)
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
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
				if(message.content.split(" ")[1] == undefined){
					try{
						let username = message.author.id;
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8");
						playername = osuid;
					}catch(e){
						console.log(e);
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。");
						return;
					};
				}else{
					playername = message.content.split(" ")[1];
					if(playername == undefined){
						message.reply("メッセージからユーザー名を取得するのに失敗しました。");
						return;
					}else if(playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
						return;
					};
				};
				const recentplay = await Recentplay(apikey, playername, 3);
				if(recentplay == 0){
					message.reply(`${playername}さんには24時間以内にプレイしたMania譜面がないようです。`);
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
				if(modforresult.length == 0){
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
					.addField("`Map Info`", `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, true)
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

		if (message.content == "!r") {
			message.reply("使い方: !r(o, t, c, m) <osu!ユーザーネーム(省略可)>");
			return;
		};

		if (message.content.startsWith("!reg")) {
			if(message.content == "!reg"){
				message.reply("使い方: !reg <osu!ユーザーネーム>");
				return;
			}else{
				const username = message.author.id;
				const osuid = message.content.split(" ")[1];
				try{
					fs.writeFileSync(`./Player infomation/${username}.txt`, osuid, "utf-8");
					message.reply(`${message.author.username} さんは ${osuid} として保存されました!`);
				}catch(e){
					console.log(e);
					message.reply("ユーザーを登録する際にエラーが発生しました。");
					return;
				};
			};
		};

		if(message.content.startsWith("!ispp")){
			try{
				if(message.content == "!ispp"){
					message.reply("使い方: !ispp <マップリンク> <Mods(省略可)>");
					return;
				};
				let mods = [];
				let modsforcalc;
				if(message.content.split(" ")[1] == undefined){
					message.reply("マップリンクを入力してください。");
					return;
				}else if(message.content.split(" ")[1] == ""){
					message.reply("マップリンクの前の空白が1つ多い可能性があります。");
					return;
				};
				if(message.content.split(" ")[2] == undefined){
					mods.push("NM");
					modsforcalc = 0;
				}else if(message.content.split(" ")[2] == ""){
					message.reply("Modsの前の空白が1つ多い可能性があります。");
					return;
				}else{
					mods.push(message.content.split(" ")[2].toUpperCase());
					mods = splitString(mods);
					if(!checkStrings(mods)){
						message.reply("入力されたModは存在しません。存在するModを指定するようにしてください。");
						return;
					};
					if((mods.includes("NC") && mods.includes("HT")) || (mods.includes("DT") && mods.includes("HT") || (mods.includes("DT") && mods.includes("NC")) || (mods.includes("EZ") && mods.includes("HR")) )){
						message.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
						return;
					};
					if(mods.includes("NC")){
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
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if (message.content.startsWith("!lb")) {
			try{
				if(message.content == "!lb"){
					message.reply("使い方: !s <マップリンク> <Mods(省略可)>");
					return;
				};
				const maplink = message.content.split(" ")[1];
				if(maplink == undefined){
					message.reply("マップリンクを入力してください。");
					return;
				};
				if(maplink == ""){
					message.reply("マップリンクの前の空白が1つ多いかも知れません。");
					return;
				};
				const beatmapid = maplink.split("/")[5].split(" ")[0];
				let mods = [];
				if(message.content.split(" ")[2] == ""){
					message.reply("Modsの前の空白が1つ多いかも知れません。");
					return;
				};
				if(message.content.split(" ")[2] == undefined){
					mods.push("NM");
				}else{
					mods.push(message.content.split(" ")[2].toUpperCase());
					mods = splitString(mods);
				};
				if(!checkStrings(mods)){
					message.reply("入力されたModは存在しません。存在するModを指定するようにしてください。");
					return;
				};
				if((mods.includes("NC") && mods.includes("HT")) || (mods.includes("DT") && mods.includes("HT") || (mods.includes("DT") && mods.includes("NC")) || (mods.includes("EZ") && mods.includes("HR")) )){
					message.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
					return;
				};
				let modsnotNC = mods;
				if(mods.includes("NC")){
					mods.push("DT");
					modsnotNC = mods.filter((item) => /NC/.exec(item) == null);
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
					let modsnotDT = mods.filter((item) => /DT/.exec(item) == null);
					mods = modsnotDT;
				};
				let acc0;
				let acc1;
				let acc2;
				let acc3;
				let acc4;
				if(resulttop5.length == 5){
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
				}else if(resulttop5.length == 4){
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
				}else if(resulttop5.length == 3){
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
				}else if(resulttop5.length == 2){
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
				}else if(resulttop5.length == 1){
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
					message.reply("この譜面には選択されたModの記録が無いようです");
					return;
				};
			}catch(e){
				console.log(e);
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。");
				return;
			};
		};

		if(message.content.startsWith("!s")){
			try{
				if(message.content == "!s"){
					message.reply("使い方: !s <マップリンク> <osu!ユーザーネーム(省略可)>");
					return;
				};
				let playername;
				if(message.content.split(" ")[2] == undefined){
					try{
						let username = message.author.id;
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
					if(playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。");
						return;
					};
				};
				const maplink = message.content.split(" ")[1];
				const beatmapId = message.content.split("#")[1].split("/")[1].split(" ")[0];
				if(maplink == undefined){
					message.reply("マップリンクを入力してください。");
					return;
				};
				if(maplink == ""){
					message.reply("マップリンクの前の空白が1つ多い可能性があります。");
					return;
				};
				const Mapinfo = await getMapInfowithoutmods(maplink, apikey);
				const playersscore = await getplayerscore(apikey, beatmapId, playername, Mapinfo.mode);
				if(playersscore == 0){
					message.reply(`${playername}さんのスコアが見つかりませんでした。`);
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
					message.reply("使い方: !check <マップリンク>");
					return;
				};
				if(message.content.split(" ")[1] == ""){
					message.reply("マップリンクの前に空白が1つ多い可能性があります。");
					return;
				};
				if(message.content.split(" ")[1] == undefined){
					message.reply("マップリンクを入力してください。");
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

		if(message.content == "!bothelp"){
			message.reply("使い方: !bothelp <osu | casino | furry | ohuzake>");
			return;
		}else if(message.content == "!bothelp osu"){
			message.reply("__**osu!のコマンドの使い方**__ \n1: `!map <マップリンク> <Mods(省略可)> <Acc(省略可)>` マップのPPなどの情報や曲の詳細を見ることが出来ます。\n2: `!r<モード(o, t, c, m)> <ユーザーネーム(省略可)>` 24時間以内での各モードの最新の記録を確認することが出来ます。\n3: `!reg <osu!ユーザーネーム>` ユーザーネームを省略できるコマンドで、ユーザーネームを省略することが可能になります。\n4: `!ispp <マップリンク> <Mods(省略可)>` どのくらいPPの効率が良いかを知ることが出来ます。\n5: `!lb <マップリンク> <Mods(省略可)>` Mod別のランキングTOP5を見ることが出来ます。\n6: `!s <マップリンク> <ユーザーネーム(省略可)>` 指定されたユーザーかあなたの、その譜面での最高記録を見ることが出来ます。\n7: `!check <マップリンク>` 1/4 Streamの最高の長さを確認することが出来ます。");
			return;
		}else if(message.content == "!bothelp casino"){
			message.reply("__**カジノのコマンドの使い方**__ \n1: `/slot <賭け金額>` スロットを回すことが出来ます。\n2: `/safeslot <賭け金額>` slotとほぼ同じ挙動をし、勝ったときは普通のslotの70%になりますが、負けたときに賭け金の20%が帰ってきます。\n3: `/bank` 自分の銀行口座に今何円はいっているかを確認できます。\n4: `/send <あげたい人> <金額>` 他人にお金を上げることのできるコマンドです。\n5: `/amount <確認したい金額>` 京や垓などの単位で確認したい金額を表してくれます。\n6: `/reg` カジノにユーザー登録することが出来ます。\n7: `/reco` おすすめのslotコマンドを教えてくれます。\n8: `/lv` 今持っている金額を基にレベルを計算してくれるコマンドです。\n9: `/bankranking` カジノ機能に参加している人全員の口座の金額の桁数でランキングが作成されます。\n10: `/recoshot` /recoで出されるslotコマンドを自動で実行してくれるコマンドです。※このコマンドは口座の金額が1000溝以上の人のみ使うことのできるコマンドです。報酬金額が通常時の80%になります。\n11: `/dice` ランダムで1-6の値を出すことが出来ます。\n12: `/roulette`: 赤か黒かをランダムで出すことが出来ます。");
			return;
		}else if(message.content == "!bothelp furry"){
			message.reply("__**Furryコマンドの使い方**__ \n1: `/kemo` ケモ画像を表示することが出来ます。\n2:`!count` 保存されている全てのケモの画像や映像の数を知ることが出来ます。\n3: `!delete <メディアリンク>` 保存されている画像を削除することが出来ます。メディアリンクが必要となります。")
			return;
		}else if(message.content == "!bothelp ohuzake"){
			message.reply("__**おふざけコマンドの使い方**__ \n1: `!kunii <単語(2つ以上)>` それぞれの単語の1文字目を入れ替えることが出来ます。")
			return;
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
};

function evaluateSlotResult(result) {
	if(result[0] == result[1] && result[1] == result[2]){
		return 30n;
	}else if(result[0] == result[1] || result[1] == result[2]){
		return 10n;
	}else if(result[0] == result[2]){
		return 5n;
	}else{
		return 0n;
	};
};

function toJPUnit(num){
	const str = num;
	if(str.length >= 216){
		return "約" + `${formatBigInt(str)}`;
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

function formatBigInt(num) {
	const str = num.toString();
	if(str.length >= 216){
		const power = str.length - 1;
		const mantissa = str.slice(0, 2) + '.' + str.slice(2, 5).padEnd(3, '0');
	  	return `${mantissa} * 10^${power}`;
	}else{
		return str.toLocaleString();
	};
};

//NexusBot Function
function checkStrings(array) {
	const targetStrings = ['EZ', 'HT', 'NF', 'HR', 'SD', 'DT', 'NC', 'FL', 'SO', 'PF', 'V2', 'TD', 'HD', 'FI', 'RX', 'AP', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
	for (const element of array) {
		if(!targetStrings.includes(element)){
			return false;
		};
	};
	return true;
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
