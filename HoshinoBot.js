//必要となるライブラリ
const { Client, EmbedBuilder, Events, GatewayIntentBits, ActivityType } = require("./node_modules/discord.js");
require('./node_modules/dotenv').config();
const fs = require("fs-extra");
const { tools, auth, v2 } = require("./node_modules/osu-api-extended");
const axios = require("./node_modules/axios");
const path = require('path');
const util = require('util');
const git = require('git-clone');

//必要なファイルの読み込み
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
const { calculateScorePP } = require("./CalcGlobalPP/calculateglobalPP");
const { downloadHoshinobotFile, getCommitDiffofHoshinobot } = require("./HoshinoBot updater");
const { srchart } = require("./CheckSRgraph/checksr");

//APIキーやTOKENなど
const apikey = process.env.APIKEY;
const token = process.env.TOKEN;
const osuclientid = process.env.CLIENTID;
const osuclientsecret = process.env.CLIENTSECRET;
const appid = process.env.APPID;
const hypixelapikey = process.env.HYPIXELAPI;
const BotadminId = process.env.BOTADMINID;
const Furrychannel = process.env.FURRYCHANNEL;
const Githuburl = process.env.GITHUBURL;
const botfilepath = process.env.BOTFILEPATH;
const owner = process.env.OWNER;
const repo = process.env.REPO;
const file = process.env.FILE;

//discord.jsのインテンツを指定
const client = new Client({ intents: [GatewayIntentBits.Guilds, GatewayIntentBits.GuildMessages, GatewayIntentBits.MessageContent] })

//BOTが準備完了したら実行
client.on(Events.ClientReady, async () => {
    console.log(`Success Logged in to ほしのBot V1.0.0`)
	setInterval(() => {
		client.user.setPresence({ activities: [{ name: `ほしのBot Ver1.0.0 ping: ${client.ws.ping}`, type: ActivityType.Playing }]})
	}, 5000)
	setInterval(checkqualfiedosu, 30000)
	setInterval(checkqualfiedtaiko, 30000)
	setInterval(checkqualfiedcatch, 30000)
	setInterval(checkqualfiedmania, 30000)
	setInterval(checkrankedosu, 30000)
	setInterval(checkrankedtaiko, 30000)
	setInterval(checkrankedcatch, 30000)
	setInterval(checkrankedmania, 30000)
	setInterval(makeBackup, 3600000)
});

//カジノの絵文字
const symbols = ['🍒', '🍊', '🍇', '🔔', '💰', '⌚', '⛵'];

client.on(Events.InteractionCreate, async(interaction) =>
	{
		try {
			//コマンドじゃない場合の処理
			if (!interaction.isCommand()) return;

			//コマンドの処理
			if (interaction.commandName == "slot") {
				try {
					let betAmount = interaction.options.get('betamount')?.value;
					betAmount = BigInt(betAmount);

					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					
					//slotを打ったユーザーが登録されていない場合の処理
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//slotを打ったユーザーの銀行口座残高を取得
					let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));
					const newBalance = currentBalance - betAmount;
					
					//slotを打ったユーザーの銀行口座残高がslot後、0を下回る場合の処理
					if (newBalance <= 0n) {
						interaction.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`)
						return
					}
					
					//slotを打ったユーザーの銀行口座残高を更新
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBalance.toString(), 'utf-8');

					//slotの結果を生成
					const result = generateSlotResult();

					//slotの結果から報酬倍率を計算
					const rewardMultiplier = evaluateSlotResult(result);

					//報酬をrewardMultiplierから計算
					const reward = betAmount * rewardMultiplier;

					//報酬のプレフィックスを計算(+ or -)
					let resultprefix;
					let prefix = reward - betAmount;

					if (prefix >= 0n) {
						resultprefix = "+"
					} else {
						resultprefix = ""
					}

					//slotの結果と報酬を送信
					interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);

					//slotを打ったユーザーの銀行口座残高を取得
					let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//slotを打ったユーザーのslot後の銀行口座残高を更新
					const newBankBalance = newcurrentBalance + reward;
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBankBalance.toString(), 'utf-8');
				} catch(e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "safeslot") {
				try {
					let betAmount = interaction.options.get('betamount')?.value;
					betAmount = BigInt(betAmount);

					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					
					//slotを打ったユーザーが登録されていない場合の処理
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//slotを打ったユーザーの銀行口座残高を取得
					let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));
					const newBalance = currentBalance - betAmount;
					
					//slotを打ったユーザーの銀行口座残高がslot後、0を下回る場合の処理
					if (newBalance <= 0n) {
						interaction.reply(`この金額を賭けることは出来ません。この金額を賭けた場合、あなたの銀行口座残高が0を下回ってしまいます。(${newBalance.toLocaleString()})`)
						return
					}
					
					//slotを打ったユーザーの銀行口座残高を更新
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBalance.toString(), 'utf-8');

					//slotの結果を生成
					const result = generateSlotResult();

					//slotの結果から報酬倍率を計算
					const rewardMultiplier = evaluateSlotResult(result);

					//報酬をrewardMultiplierから計算
					let reward;
					if (rewardMultiplier == 0n) {
						reward = betAmount * 2n * 10n / 100n
					} else {
						reward = betAmount * rewardMultiplier * 7n * 10n / 100n
					}

					//報酬のプレフィックスを計算(+ or -)
					let resultprefix;
					let prefix = reward - betAmount;

					if (prefix >= 0n) {
						resultprefix = "+"
					} else {
						resultprefix = ""
					}

					//slotの結果と報酬を送信
					interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);

					//slotを打ったユーザーの銀行口座残高を取得
					let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//slotを打ったユーザーのslot後の銀行口座残高を更新
					const newBankBalance = newcurrentBalance + reward;
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBankBalance.toString(), 'utf-8');	
				} catch(e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "bankranking") {
				try {
					//Player Bankフォルダーのパス
					const folderPath = './Player Bank';

					//Player Bankフォルダー内のファイル名のパターン
					const fileNamePattern = /^(.+)\.txt$/;

					//Player Bankフォルダー内のファイルを取得
					const files = fs.readdirSync(folderPath);

					//各ユーザーの銀行口座残高の桁を取得
					const userAmounts = {};
					files.forEach(file =>
						{
							const filePath = path.join(folderPath, file)
							const match = fileNamePattern.exec(file)
							if (match) {
								const username = match[1]
								const fileContent = fs.readFileSync(filePath, 'utf8').length
								userAmounts[username] = fileContent
							}
						}
					)

					//各ユーザーの銀行口座残高の桁を降順にソート
					const sortedUserAmounts = Object.entries(userAmounts).sort((a, b) => b[1] - a[1]);

					//ランキングを作成
					let ranking = [];
					for (let i = 0; i < sortedUserAmounts.length; i++) {
						const rank = i + 1
						const username = sortedUserAmounts[i][0]
						ranking.push(`- __#**${rank}**__: **${username}** (__*${sortedUserAmounts[i][1]}桁*__)`)
					}

					//ランキングを送信
					interaction.reply(`__**Current Bank digits Ranking**__\n${ranking.join('\n')}`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "lv") {
				try {
					//レベルを取得するユーザーが登録されているかどうかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);

					//レベルを取得するユーザーが登録されていない場合の処理
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//レベルを取得するユーザーの銀行口座残高を取得
					const messageuserbalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//レベルを取得するユーザーの銀行口座残高が0の場合、0ではない場合の処理
					let currentrank = 0;
					let nextbalance = 0n;
					for (let i = 1n ; i <= 300n; i += 1n) {
						if(messageuserbalance / BigInt(120n ** i) < 1n && currentrank == 0){
							interaction.reply("あなたの現在のレベルは**__0lv__**以下です。")
							return
						}else if(messageuserbalance / BigInt(120n ** i) >= 1n){
							currentrank += 1
							nextbalance = BigInt(120n ** (i + 1n))
						}
					}

					//レベルを送信
					interaction.reply(`あなたの現在のレベルは **__${currentrank}lv__** / 300 (次のレベル => **${formatBigInt(nextbalance)}**coins)`);

				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "recoshot") {
				try {
					//recoshotを打ったユーザーが登録されているかどうかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);

					//recoshotを打ったユーザーが登録されていない場合の処理
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//recoshotを打ったユーザーの銀行口座残高を取得
					const userbank = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//recoshotを打ったユーザーの銀行口座残高が1000溝以下の場合の処理
					if (userbank <= 100000000000000000000000000000000000n) {
						interaction.reply("このコマンドを使うには、1000溝以上のお金が銀行口座にある必要があります。")
						return
					}

					//recoshotを打ったユーザーの銀行口座残高が0の場合の処理
					if (userbank <= 0n) {
						interaction.reply("賭け金額を計算できるほどのお金を持っていないようです。他人からもらうか、稼ぐかしてください。")
						return
					}

					//recoshotを打ったユーザーの銀行口座残高からおすすめの賭け金額を計算
					const recommend = (userbank / 15n).toString();
					let betAmount = recommend;
					betAmount = BigInt(betAmount);

					//recoshotを打ったユーザーの銀行口座残高を取得
					let currentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//recoshotを打ったユーザーのrecoshot後の銀行口座残高の計算
					const newBalance = currentBalance - betAmount;

					//recoshotを打ったユーザーの銀行残高を賭け金分減らす
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBalance.toString(), 'utf-8');

					//recoshotの結果を生成
					const result = generateSlotResult();

					//recoshotの結果から報酬倍率を計算
					const rewardMultiplier = evaluateSlotResult(result);

					//報酬をrewardMultiplierから計算
					const reward = betAmount * rewardMultiplier * 8n * 10n / 100n;

					//報酬のプレフィックスを計算(+ or -)
					let resultprefix;
					let prefix = reward - betAmount;
					if (prefix >= 0n) {
						resultprefix = "+"
					} else {
						resultprefix = ""
					}

					//recoshotの結果と報酬を送信
					interaction.reply(`結果: ${result.join(' ')}\n報酬: ${formatBigInt(reward)}coin (${resultprefix}${formatBigInt((reward - betAmount))})`);

					//recoshotを打ったユーザーの銀行口座残高を取得
					let newcurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));

					//recoshotを打ったユーザーのrecoshot後の銀行口座残高を更新
					const newBankBalance = newcurrentBalance + reward;
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newBankBalance.toString(), 'utf-8');
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "reco") {
				try {
					//recoを打ったユーザーが登録されているかどうかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//recoを打ったユーザーの銀行口座残高が0の場合の処理
					const userbank = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));
					if (userbank <= 0) {
						interaction.reply("賭け金額を計算できるほどのお金を持っていないようです。他人からもらうか、稼ぐかしてください。")
						return
					}

					//recoを打ったユーザーの銀行口座残高からおすすめの賭け金額を計算
					const recommend = (userbank / 15n).toString();

					//slotコマンドの送信
					interaction.reply(`おすすめのslot賭け金: ${recommend}`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "bank") {
				try {
					//bankを打ったユーザーが登録されているかどうかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					
					//bankを打ったユーザーが登録されていない場合の処理
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}

					//bankを打ったユーザーの銀行口座残高を取得
					const currentbank = fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8');

					//bankを打ったユーザーの銀行口座残高を送信
					interaction.reply(`${interaction.user.username}の現在の銀行口座残高: \n ${formatBigInt(currentbank)}(${toJPUnit(currentbank)}) coins`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "amount") {
				try {
					//amountをメッセージから取得
					const amount = interaction.options.get('amount').value;

					//amountの結果を送信
					interaction.reply(`${toJPUnit(amount)}`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "regcasino") {
				try {
					//regを打ったユーザーが登録されているかどうかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					if(truefalseuser) {
						interaction.reply("あなたはもう既にこのカジノに登録されています。")
						return
					}
	
					//regを打ったユーザーの銀行口座残高を作成
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, "1000000", "utf-8");
					interaction.reply(`カジノへようこそ！ ${interaction.user.username}! 初回なので1000000コインを差し上げます。`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("ユーザー登録中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "send") {
				try {
					//送り先のユーザー名を取得
					const sentusername = interaction.options.get('username').value;
	
					//送り先のユーザー名が自分自身の場合の処理
					if(sentusername == interaction.user.username){
						interaction.reply("自分自身に送ることは許されていません！")
						return
					}
	
					//送り先のユーザー名が存在するかの確認
					const truefalsesentuser = await checkFileExists(`./Player Bank/${sentusername}.txt`);
					if (!truefalsesentuser) {
						interaction.reply(`${sentusername} というユーザーはこのカジノに登録されていません。\`/regcasino\`で登録してもらってください。`)
						return
					}
	
					//送る本人が存在するかの確認
					const truefalseuser = await checkFileExists(`./Player Bank/${interaction.user.username}.txt`);
					if (!truefalseuser) {
						interaction.reply("このカジノにユーザー登録されていないようです。`/regcasino`と入力して登録してください。")
						return
					}
	
					//送りたい希望金額を取得
					let sentmoney = interaction.options.get('amount').value;

					//送りたい希望金額をBigIntに変換
					sentmoney = BigInt(sentmoney);
	
					//送りたい希望金額がマイナスの場合の処理
					if (sentmoney < 0n) {
						interaction.reply("送る金額をマイナスにすることは出来ません。")
						return
					}
	
					//送る人の銀行口座残高を取得
					const messagercurrentBalance = BigInt(fs.readFileSync(`./Player Bank/${interaction.user.username}.txt`, 'utf-8'));
	
					//送る人の銀行口座残高から送りたい希望金額を引く
					const newmessagerbankbalance = messagercurrentBalance - sentmoney;
	
					//送る人の銀行口座残高が0を下回る場合の処理
					if (newmessagerbankbalance < 0n) {
						interaction.reply(`この金額を送ることは出来ません。この金額を送った場合、あなたの銀行口座残高が0を下回ってしまいます。(${newmessagerbankbalance})`)
						return
					}
	
					//送る人の銀行口座残高を更新
					fs.writeFileSync(`./Player Bank/${interaction.user.username}.txt`, newmessagerbankbalance.toString(), 'utf-8');
	
					//送り先の銀行口座残高を取得
					const sentusercurrentbalance = BigInt(fs.readFileSync(`./Player Bank/${sentusername}.txt`, 'utf-8'));
	
					//送り先の銀行口座残高に送りたい希望金額を足す
					const newsentusercurrentbalance = sentusercurrentbalance + sentmoney;
	
					//送り先の銀行口座残高を更新
					fs.writeFileSync(`./Player Bank/${sentusername}.txt`, newsentusercurrentbalance.toString(), 'utf-8');
	
					//送金完了を知らせるメッセージを送信
					interaction.reply("送金が完了しました。");
				} catch (e) {
					console.log(e)
					interaction.channel.send("送金処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "dice") {
				try {
					//diceの結果を送信
					interaction.reply(`サイコロを振った結果: **${Math.floor(Math.random() * 6) + 1}**`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "roulette") {
				try {
					//ルーレットの結果を生成
					const num = Math.floor(Math.random() * 2);
					if(num == 0){
						interaction.reply("ルーレットの結果: **赤**")
						return
					}else if(num == 1){
						interaction.reply("ルーレットの結果: **黒**")
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "kemo") {
				try {
					//テキストファイルから一覧を取得
					const text = fs.readFileSync(`./Furry/Furry.txt`, 'utf-8');
	
					//一覧を配列に変換
					const lines = text.split(" ").filter((function(link) {return link !== "";}));
	
					//配列の要素数を取得
					const lineCount = lines.length;
	
					//配列の要素数からランダムな数字を生成
					const randomLineNumber = Math.floor(Math.random() * lineCount);
	
					//ランダムな数字から一覧の要素を取得
					const randomLine = lines[randomLineNumber];
					const lineextension = randomLine.split(".")[randomLine.split(".").length - 1]
	
					//webからデータを取得
					let error = false;
					const response = await axios.get(randomLine, { responseType: 'arraybuffer' }).catch(error => {
						interaction.reply(`ファイルが見つからなかったため、自動削除します。\nリンク: ${randomLine}`)
						const currenttext = fs.readFileSync(`./Furry/Furry.txt`, "utf-8")
						const newtext = currenttext.replace(`${randomLine} `, "")
						fs.writeFileSync(`./Furry/Furry.txt`, newtext)
						interaction.channel.send("ファイルの削除が完了しました");
						error = true;
					})
	
					//axiosがアクセスできなかった時の処理
					if (error) return;
					
					//画像のデータを取得
					const picData = response.data;
					
					//画像の送信
					interaction.reply({ files: [{ attachment: picData, name: `Furry.${lineextension}` }] })
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "delete") {
				try {
					const medialink = interaction.options.get('medialink').value;

					//リンクを削除する処理
					if (fs.readFileSync(`./Furry/Furry.txt`, "utf-8").includes(medialink)) {
						const currenttext = fs.readFileSync(`./Furry/Furry.txt`, "utf-8")
						const newtext = currenttext.replace(`${medialink} `, "")
						fs.writeFileSync(`./Furry/Furry.txt`, newtext)
						interaction.reply("ファイルの削除が完了しました");
					} else {
						interaction.reply("そのリンクはリンク一覧に存在しません。")
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "count") {
				try {
					//テキストファイルから一覧を取得
					const text = fs.readFileSync(`./Furry/Furry.txt`, 'utf-8');

					//一覧を配列に変換
					const lines = text.split(" ").filter((function(link) {return link !== "";}));

					//配列の要素数を取得
					const lineCount = lines.length;

					//要素数の結果を送信
					interaction.reply(`今まで追加した画像や映像、gifの合計枚数は${lineCount}枚です。`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "pic") {
				try {
					//メッセージからタグを取得
					const tag = interaction.options.get('tag').value;
	
					//タグが存在するかの確認
					if (!fs.existsSync(`./tag/${tag}/picture.txt`)) {
						interaction.reply("このタグは存在しません。")
						return
					}
	
					//タグの中身が空の場合の処理
					const text = fs.readFileSync(`./tag/${tag}/picture.txt`, 'utf-8').split(" ").filter((function(link) {return link !== "";}));
					if (text.length == 0) {
						interaction.reply("このタグにはファイルがないみたいです。")
						return
					}
	
					//タグの中身のファイルからランダムで画像を選択
					const lineCount = text.length;
					const randomLineNumber = Math.floor(Math.random() * lineCount);
					const randomLine = text[randomLineNumber];
					const lineextension = randomLine.split(".")[randomLine.split(".").length - 1]
	
					//webからデータを取得
					let error = false;
					const response = await axios.get(randomLine, { responseType: 'arraybuffer' }).catch(error => {
						interaction.reply(`ファイルが見つからなかったため、自動削除します。\nリンク: ${randomLine}`)
						const currenttext = fs.readFileSync(`./tag/${tag}/picture.txt`, "utf-8")
						const newtext = currenttext.replace(`${randomLine} `, "")
						fs.writeFileSync(`./tag/${tag}/picture.txt`, newtext)
						interaction.channel.send("ファイルの削除が完了しました");
						error = true;
					})
	
					//axiosがアクセスできなかった時の処理
					if (error) return;
					
					//画像のデータを取得
					const picData = response.data;
	
					//画像の送信
					interaction.reply({ files: [{ attachment: picData, name: `${tag}.${lineextension}` }] })
				} catch(e) {
					console.log(e)
					interaction.reply("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "settag") {
				try {
					//ディリクトリ、ファイルの作成
					const mkdir = util.promisify(fs.mkdir);
					const writeFile = util.promisify(fs.writeFile);
					await mkdir(`./tag/${interaction.channel.name}`);
					await writeFile(`./tag/${interaction.channel.name}/picture.txt`, "");
					interaction.reply("タグが正常に作成されました。")
				} catch (e) {
					interaction.channel.send("このタグは既に存在します。")
					return
				}
			}

			if (interaction.commandName == "deltag") {
				try {
					//タグが存在するかの確認、しなかった場合の処理
					if (!fs.existsSync(`./tag/${interaction.channel.name}/picture.txt`)) {
						interaction.reply("このタグは存在しません。")
						return
					}

					//タグの削除
					fs.remove(`./tag/${interaction.channel.name}/picture.txt`, (err) => {
						if (err) {
							console.log(err)
							interaction.reply("ファイルを削除する際にエラーが発生しました。")
						}
					})

					//タグの削除が完了したことを知らせるメッセージを送信
					interaction.reply("タグが正常に削除されました。")
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "delpic") {
				try {
					//タグ(チャンネル)が登録されていなかった場合の処理
					if (!fs.existsSync(`./tag/${interaction.channel.name}/picture.txt`)) {
						interaction.reply("このタグは登録されていません。")
						return;
					}

					//削除したいリンクを取得
					const wannadelete = interaction.options.get('medialink').value;

					//削除したいリンクの前の空白が1つ多い場合の処理
					if (wannadelete == "") {
						interaction.reply("削除したいリンクの前の空白が1つ多い可能性があります。")
						return
					}

					//リンクを削除する処理
					if (fs.readFileSync(`./tag/${interaction.channel.name}/picture.txt`, "utf-8").includes(wannadelete)) {
						const currenttext = fs.readFileSync(`./tag/${interaction.channel.name}/picture.txt`, "utf-8")
						const newtext = currenttext.replace(`${wannadelete} `, "")
						fs.writeFileSync(`./tag/${interaction.channel.name}/picture.txt`, newtext)
						interaction.reply("ファイルの削除が完了しました");
					} else {
						interaction.reply("そのリンクはリンク一覧に存在しません。")
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("ファイルの削除中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "piccount") {
				try {
					//タグ(チャンネル)が登録されていなかった場合の処理
					if (!fs.existsSync(`./tag/${interaction.channel.name}/picture.txt`)) {
						interaction.reply("このタグは登録されていません。")
						return;
					}

					//テキストファイルから一覧を取得
					const text = fs.readFileSync(`./tag/${interaction.channel.name}/picture.txt`, 'utf-8');

					//一覧を配列に変換
					const lines = text.split(" ").filter((function(link) {return link !== "";}));

					//配列の要素数を取得
					const lineCount = lines.length;

					if (lineCount == 0) {
						interaction.reply("このタグにはファイルがないみたいです。")
						return
					}

					//要素数の結果を送信
					interaction.reply(`今まで${interaction.channel.name}タグに追加した画像や映像、gifの合計枚数は${lineCount}枚です。`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "downloadtag") {
				try {
					//タグ(チャンネル)が登録されていなかった場合の処理
					if (!fs.existsSync(`./tag/${interaction.channel.name}/picture.txt`)) {
						interaction.reply("このタグは登録されていません。")
						return;
					}
					
					const link = "https://github.com/puk06/PictureDownloader/releases/download/V1.1/PictureDownloader.zip"

					//textファイルを送信
					interaction.reply(`これがタグ: ${interaction.channel.name}のPictureファイルです。これを\nGithub: ${link}\nこのソフトのフォルダの中に入れてjsファイルを実行してください。※Node.jsが必須です。`)
					interaction.channel.send({ files: [{ attachment: `./tag/${interaction.channel.name}/picture.txt`, name: 'picture.txt' }] });
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "alltags") {
				try {
					//全てのフォルダー名からタグを取得
					const tags = fs.readdirSync(`./tag/`, { withFileTypes: true }).filter((function(tag) {
						return fs.readdirSync(`./tag/${tag.name}`).length !== 0;
					}));
	
					//タグの数が0だった場合
					if (tags.length == 0) {
						interaction.reply("タグが存在しません。")
						return
					}
	
					//タグの一覧を格納する配列を作成
					let taglist = [];
	
					//タグの一覧を作成
					for (let i = 0; i < tags.length; i++ ) {
						taglist.push(`${i + 1}: ${tags[i].name}\n`);
					}
	
					//タグの一覧を送信
					interaction.reply(`現在登録されているタグは以下の通りです。\n${taglist.join("")}`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "quote") {
				try {
					//メッセージからタグを取得
					const tag = interaction.options.get('tag').value;
	
					//タグが存在するかの確認
					if (!fs.existsSync(`./quotetag/${tag}/quote.txt`)) {
						interaction.reply("このタグは存在しません。")
						return
					}
	
					//タグの中身が空の場合の処理
					const text = fs.readFileSync(`./quotetag/${tag}/quote.txt`, 'utf-8').split(" ").filter((function(link) {return link !== "";}));
					if (text.length == 0) {
						interaction.reply("このタグには名言がないみたいです。")
						return
					}
	
					//タグの中身のファイルからランダムで名言を選択
					const lineCount = text.length;
					const randomLineNumber = Math.floor(Math.random() * lineCount);
					const randomLine = text[randomLineNumber];
	
					//画像の送信
					interaction.channel.send(`**${randomLine}** - ${tag}`);
				} catch(e) {
					console.log(e)
					interaction.reply("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "setquotetag") {
				try {
					//ディリクトリ、ファイルの作成
					const mkdir = util.promisify(fs.mkdir);
					const writeFile = util.promisify(fs.writeFile);
					await mkdir(`./quotetag/${interaction.channel.name}`);
					await writeFile(`./quotetag/${interaction.channel.name}/quote.txt`, "");
					interaction.reply("タグが正常に作成されました。")
				} catch (e) {
					interaction.channel.send("このタグは既に存在します。")
					return
				}
			}

			if (interaction.commandName == "delquotetag") {
				try {
					//タグが存在するかの確認、しなかった場合の処理
					if (!fs.existsSync(`./quotetag/${interaction.channel.name}/quote.txt`)) {
						interaction.reply("このタグは存在しません。")
						return
					}
	
					//タグの削除
					fs.remove(`./quotetag/${interaction.channel.name}/quote.txt`, (err) => {
						if (err) {
							console.log(err)
							interaction.reply("ファイルを削除する際にエラーが発生しました。")
						}
					})
	
					//タグの削除が完了したことを知らせるメッセージを送信
					interaction.reply("タグが正常に削除されました。")
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "delquote") {
				try {
					//タグ(チャンネル)が登録されていなかった場合の処理
					if (!fs.existsSync(`./quotetag/${interaction.channel.name}/quote.txt`)) {
						interaction.reply("このタグは存在しません。")
						return
					}
	
					//削除したいリンクを取得
					const wannadelete = interaction.options.get('quote').value;
	
					//削除したいリンクの前の空白が1つ多い場合の処理
					if (wannadelete == "") {
						interaction.reply("削除したいリンクの前の空白が1つ多い可能性があります。")
						return
					}
	
					//リンクを削除する処理
					if (fs.readFileSync(`./quotetag/${interaction.channel.name}/quote.txt`, "utf-8").includes(wannadelete)) {
						const currenttext = fs.readFileSync(`./quotetag/${interaction.channel.name}/quote.txt`, "utf-8")
						const newtext = currenttext.replace(`${wannadelete} `, "")
						fs.writeFileSync(`./quotetag/${interaction.channel.name}/quote.txt`, newtext)
						interaction.reply("ファイルの削除が完了しました");
					} else {
						interaction.reply("そのリンクはリンク一覧に存在しません。")
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("ファイルの削除中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "quotecount") {
				try {
					//タグ(チャンネル)が登録されていなかった場合の処理
					if (!fs.existsSync(`./quotetag/${interaction.channel.name}/quote.txt`)) {
						interaction.reply("このタグは登録されていません。")
						return;
					}
	
					//テキストファイルから一覧を取得
					const text = fs.readFileSync(`./quotetag/${interaction.channel.name}/quote.txt`, 'utf-8');
	
					//一覧を配列に変換
					const lines = text.split(" ").filter((function(link) {return link !== "";}));
	
					//配列の要素数を取得
					const lineCount = lines.length;
	
					if (lineCount == 0) {
						interaction.reply("このタグには名言がないみたいです。")
						return
					}
	
					//要素数の結果を送信
					interaction.reply(`今まで${interaction.channel.name}タグに追加した名言の合計枚数は${lineCount}個です。`);
				} catch (e) {
					console.log(e)
					interaction.channel.send('ファイルを読み込む際にエラーが発生しました。')
					return
				}
			}

			if (interaction.commandName == "allquotetags") {
				try {
					//全てのフォルダー名からタグを取得
					const tags = fs.readdirSync(`./quotetag/`, { withFileTypes: true }).filter((function(tag) {
						return fs.readdirSync(`./quotetag/${tag.name}`).length !== 0;
					}));
	
					//タグの数が0だった場合
					if (tags.length == 0) {
						interaction.reply("タグが存在しません。")
						return
					}
	
					//タグの一覧を格納する配列を作成
					let taglist = [];
	
					//タグの一覧を作成
					for (let i = 0; i < tags.length; i++ ) {
						taglist.push(`${i + 1}: ${tags[i].name}\n`);
					}
	
					//タグの一覧を送信
					interaction.reply(`現在登録されているタグは以下の通りです。\n${taglist.join("")}`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("エラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "kunii") {
				try {
					//メッセージから文章を取得
					const kuniicontent = interaction.options.get('content').value;
	
					//"うんこえろしね"が入力された場合の処理
					if (kuniicontent == "うんこえろしね") {
						interaction.reply("しんこうろえね")
						return
					}
	
					//文章が入力されてない場合の処理
					if (kuniicontent == undefined) {
						interaction.reply("できないからやばい")
						return
					}
	
					//文章を形態素解析
					const url = "https://labs.goo.ne.jp/api/morph";
					const params = {
						app_id: appid,
						sentence: kuniicontent
					};
	
					//形態素解析の結果を取得
					let error = false;
					const data = await axios.post(url, params)
					.then((response) => {
							return response.data.word_list
					}).catch((e) => {
						console.log(e);
						interaction.reply("データ取得中になんらかのエラーが発生しました。")
						error = true;
					})

					//axiosがアクセスできなかった時の処理
					if (error) return;
	
					//形態素解析の結果から文章を生成
					if (data[0].length == undefined || data[0].length == 0 || data[0].length == 1 || data[0].length > 4) {
						interaction.channel.send("できないからやばい")
						return
					} else if (data[0].length == 2) {
						const data1 = data[0][0][0]
						const data2 = data[0][1][0]
						const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1)
						interaction.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`)
						return
					} else if (data[0].length == 3) {
						const data1 = data[0][0][0]
						const data2 = data[0][1][0]
						const data3 = data[0][2][0]
						const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1) + data3
						interaction.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`)
						return
					} else if (data[0].length == 4) {
						const data1 = data[0][0][0]
						const data2 = data[0][1][0]
						const data3 = data[0][2][0]
						const data4 = data[0][3][0]
						const kuniiWord = data2.charAt(0) + data1.slice(1) + data1.charAt(0) + data2.slice(1) + data4.charAt(0) + data3.slice(1) + data3.charAt(0) + data4.slice(1)
						interaction.channel.send(`${kuniicontent}\n↹\n${kuniiWord}`)
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "link") {
				try {
					//チャンネルidを取得
					const channelid = interaction.channel.id;
	
					//全ての登録済みのチャンネルを取得、チャンネルidが既にChannels.txtにあった場合の処理
					const allchannels = fs.readFileSync("./BeatmapLinkChannels/Channels.txt", "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
					if (allchannels.includes(channelid)) {
						interaction.reply("このチャンネルは既にマップ情報が表示されるようになっています。")
						return
					}
	
					//Channels.txtにチャンネルidを追加
					fs.appendFile("./BeatmapLinkChannels/Channels.txt", `${channelid} `, function (err) {
						if (err) throw err
					})
	
					//メッセージ送信
					interaction.reply(`このチャンネルにマップリンクが送信されたら自動的にマップ情報が表示されるようになりました。解除したい場合は!unlinkコマンドを使用してください。`)
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "unlink") {
				try {
					//チャンネルidを取得
					const channelid = interaction.channel.id
	
					//全ての登録済みのチャンネルを取得、チャンネルidが既にChannels.txtにあった場合の処理(削除)
					const allchannels = fs.readFileSync("./BeatmapLinkChannels/Channels.txt", "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
					if (allchannels.includes(channelid)) {
						const currentchannels = fs.readFileSync("./BeatmapLinkChannels/Channels.txt", "utf-8")
						const newchannels = currentchannels.replace(`${channelid} `, "")
						fs.writeFileSync("./BeatmapLinkChannels/Channels.txt", newchannels)
					} else {
						interaction.reply("このチャンネルでは既にマップ情報が表示されないようになっています。")
						return
					}
	
					//メッセージ送信
					interaction.reply(`このチャンネルにマップリンクが送信されてもマップ情報が表示されないようになりました。再度表示したい場合は!linkコマンドを使用してください。`)
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "check") {
				try {
					//ビートマップを取得
					if (interaction.options.get("beatmaplink").value.startsWith("https://osu.ppy.sh/beatmapsets/")) {
						interaction.reply("ビートマップリンクの形式が間違っています。")
						return
					}
					
					//マップデータを取得
					const Mapdata = await getMapInfowithoutmods(Mapdata, apikey);
					await getOsuBeatmapFile(Mapdata.beatmapId);
					const streamdata = await checkStream(Mapdata.beatmapId, Mapdata.bpm);
	
					//メッセージ送信
					await interaction.reply(`Streamlength: ${streamdata} `);
	
					//一時的なBeatmapファイルを削除
					try {
						fs.unlinkSync(`./BeatmapFolder/${Mapdata.beatmapId}.txt`);
					} catch (e) {
						console.log(e)
						interaction.reply("Beatmapファイルを削除する際にエラーが発生しました。")
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "ispp") {
				try {
					//Modsの処理
					let mods = [];
					let modsforcalc;

					const maplink = interaction.options.get("beatmaplink").value;
					const Mods = interaction.options?.get("mods")?.value;
	
					//Modsが入力されなかったときの処理、されたときの処理
					if (Mods == undefined) {
						mods.push("NM")
						modsforcalc = 0
					} else {
						mods.push(interaction.options?.get("mods")?.value.toUpperCase())
	
						//Modsを配列に変える処理
						mods = splitString(mods)
	
						//Modsが正しいかどうか判別する処理
						if (!checkStrings(mods)) {
							interaction.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。")
							return
						}
						if ((mods.includes("NC") && mods.includes("HT")) || (mods.includes("DT") && mods.includes("HT") || (mods.includes("DT") && mods.includes("NC")) || (mods.includes("EZ") && mods.includes("HR")) )) {
							interaction.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。")
							return
						}
	
						//ModsにNCが入っていたときにDTに置き換える処理
						if (mods.includes("NC")) {
							let modsnotDT = Mods.filter((item) => /NC/.exec(item) == null)
							modsnotDT.push("DT")
							modsforcalc = parseModString(modsnotDT);
						} else {
							modsforcalc = parseModString(mods);
						}
					}

					let data = await getMapInfo(maplink, apikey, mods);
					let sr = await calculateSR(data.beatmapId, modsforcalc, modeconvert(data.mode));
	
					//Mapstatusを取得(Ranked, Loved, Qualified, Pending, WIP, Graveyard)
					const Mapstatus = mapstatus(data.approved);
	
					//PP、FPを計算
					const FP = parseFloat(sr.S0 / data.totallength * 100).toFixed(1);
					let FPmessage;
					let rankplayer;
	
					//FPによってメッセージを変える処理
					if (FP >= 700) {
						FPmessage = "**This is SO GOOD PP map**"
					} else if (FP >= 400) {
						FPmessage = "**This is PP map**"
					} else if (FP >= 200) {
						FPmessage = "**This is PP map...?idk**"
					} else if (FP >= 100) {
						FPmessage = "This is no PP map ;-;"
					} else {
						FPmessage = "This is no PP map ;-;"
					}
	
					//PPによってメッセージを変える処理
					if (sr.S0 >= 750) {
						rankplayer = "**High rank player**"
					} else if(sr.S0 >= 500) {
						rankplayer = "**Middle rank player**"
					} else if(sr.S0 >= 350) {
						rankplayer = "**Funny map player**"
					} else {
						rankplayer = "**Beginner player**"
					}
	
					//"PP/s"を計算
					const ppdevidetotallength = (sr.S0 / data.totallength);
					const ppdevideparsefloat = parseFloat(ppdevidetotallength).toFixed(1);
	
					//メッセージを送信
					interaction.reply(`Totalpp : **${sr.S0}** (**${Mapstatus}**) | Farmscore : **${FP}** For ${rankplayer} | ${FPmessage} (${ppdevideparsefloat} pp/s)`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "lb") {
				try {
					//マップリンクを取得
					const maplink = interaction.options.get("beatmaplink").value;
	
					//BeatmapIdをメッセージから取得
					const beatmapid = maplink.split("/")[maplink.split("/").length - 1]
					const Mods = interaction.options?.get("mods")?.value;

					//Modsの処理
					let mods = [];

					if (Mods == undefined) {
						mods.push("NM")
					} else {
						mods.push(Mods.toUpperCase());
						mods = splitString(mods)
					}
	
					//Modsが正しいかどうか判別する処理
					if (!checkStrings(mods)) {
						interaction.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。")
						return
					}
					if ((mods.includes("NC") && mods.includes("HT")) || (mods.includes("DT") && mods.includes("HT") || (mods.includes("DT") && mods.includes("NC")) || (mods.includes("EZ") && mods.includes("HR")))) {
						interaction.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。")
						return
					}
	
					//ModsにNCが入っていたときにDTに置き換える処理
					let modsnotNC = mods;
					if (mods.includes("NC")) {
						mods.push("DT")
						modsnotNC = mods.filter((item) => /NC/.exec(item) == null)
					}
	
					//マップリンクから必要な情報を取得
					const Mapinfo = await getMapInfo(maplink, apikey, mods);
					const mapperinfo = await getplayersdata(apikey, Mapinfo.mapper, Mapinfo.mode);
	
					//マッパーの情報の取得中にエラーが発生した場合の処理
					if (mapperinfo == undefined) {
						interaction.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
						return
					}
	
					const mapsetlink = Mapinfo.maplink.split("/")[4].split("#")[0];
	
					//SR、BPMを計算
					let SR = await calculateSR(beatmapid, parseModString(modsnotNC), modeconvert(Mapinfo.mode));
					let BPM = Mapinfo.bpm;
	
					//Mods、BPMの処理
					if (mods.includes('NC')) {
						mods.push('DT')
					}
					if (mods.includes("NC") || mods.includes("DT")) {
						BPM *= 1.5
					} else if (mods.includes("HT")) {
						BPM *= 0.75
					}

					interaction.reply("ランキングの作成中です...")
	
					//top5を取得
					const resulttop5 = await GetMapScore(beatmapid, parseModString(mods), apikey, Mapinfo.mode);
	
					if (resulttop5 == undefined) {
						interaction.channel.send("この譜面には選択されたModの記録が無いようです")
						return
					}
	
					//ModsにDT、NCの療法が含まれていたときの処理
					if (mods.includes("DT") && mods.includes("NC")) {
						let modsnotDT = mods.filter((item) => /DT/.exec(item) == null)
						mods = modsnotDT
					}
	
					//メッセージ内容を作成、送信
					let acc0;
					let acc1;
					let acc2;
					let acc3;
					let acc4;
					if (resulttop5.length == 5) {
						acc0 = tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode))
						acc1 = tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode))
						acc2 = tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode))
						acc3 = tools.accuracy({300: resulttop5[3].count300, 100: resulttop5[3].count100, 50: resulttop5[3].count50, 0: resulttop5[3].countmiss, geki:  resulttop5[3].countgeki, katu: resulttop5[3].countkatu}, modeconvert(Mapinfo.mode))
						acc4 = tools.accuracy({300: resulttop5[4].count300, 100: resulttop5[4].count100, 50: resulttop5[4].count50, 0: resulttop5[4].countmiss, geki:  resulttop5[4].countgeki, katu: resulttop5[4].countkatu}, modeconvert(Mapinfo.mode))
							const embed = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor({ name: `Mapped by ${mapperinfo.username}`, iconURL: mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${mapperinfo.user_id}` })								.addFields({ name: "**MapInfo**", value: `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, inline: true })
								.addFields({ name: "\`#1\`", value: `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`, inline: false })
								.addFields({ name: "\`#2\`", value: `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`, inline: false })
								.addFields({ name: "\`#3\`", value: `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`, inline: false })
								.addFields({ name: "\`#4\`", value: `**Rank**: \`${resulttop5[3].rank}\` **Player**: \`${resulttop5[3].username}\` **Score**: ${resulttop5[3].score} \n [\`${resulttop5[3].maxcombo}\`combo] \`${acc3}\`% \`${resulttop5[3].pp}\`pp miss:${resulttop5[3].countmiss}`, inline: false })
								.addFields({ name: "\`#5\`", value: `**Rank**: \`${resulttop5[4].rank}\` **Player**: \`${resulttop5[4].username}\` **Score**: ${resulttop5[4].score} \n [\`${resulttop5[4].maxcombo}\`combo] \`${acc4}\`% \`${resulttop5[4].pp}\`pp miss:${resulttop5[4].countmiss}`, inline: false })
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
							interaction.channel.send({ embeds: [embed] })
						return
					} else if (resulttop5.length == 4) {
						acc0 = tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode))
						acc1 = tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode))
						acc2 = tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode))
						acc3 = tools.accuracy({300: resulttop5[3].count300, 100: resulttop5[3].count100, 50: resulttop5[3].count50, 0: resulttop5[3].countmiss, geki:  resulttop5[3].countgeki, katu: resulttop5[3].countkatu}, modeconvert(Mapinfo.mode))
							const embed = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor({ name: `Mapped by ${mapperinfo.username}`, iconURL: mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${mapperinfo.user_id}` })
								.addFields({ name: "**MapInfo**", value: `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, inline: true })
								.addFields({ name: "\`#1\`", value: `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`, inline: false })
								.addFields({ name: "\`#2\`", value: `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`, inline: false })
								.addFields({ name: "\`#3\`", value: `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`, inline: false })
								.addFields({ name: "\`#4\`", value: `**Rank**: \`${resulttop5[3].rank}\` **Player**: \`${resulttop5[3].username}\` **Score**: ${resulttop5[3].score} \n [\`${resulttop5[3].maxcombo}\`combo] \`${acc3}\`% \`${resulttop5[3].pp}\`pp miss:${resulttop5[3].countmiss}`, inline: false })
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						interaction.channel.send({ embeds: [embed] })
						return
					} else if (resulttop5.length == 3) {
						acc0 = tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode))
						acc1 = tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode))
						acc2 = tools.accuracy({300: resulttop5[2].count300, 100: resulttop5[2].count100, 50: resulttop5[2].count50, 0: resulttop5[2].countmiss, geki:  resulttop5[2].countgeki, katu: resulttop5[2].countkatu}, modeconvert(Mapinfo.mode))
							const embed = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor({ name: `Mapped by ${mapperinfo.username}`, iconURL: mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${mapperinfo.user_id}` })								.addFields({ name: "**MapInfo**", value: `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, inline: true })
								.addFields({ name: "\`#1\`", value: `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`, inline: false })
								.addFields({ name: "\`#2\`", value: `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`, inline: false })
								.addFields({ name: "\`#3\`", value: `**Rank**: \`${resulttop5[2].rank}\` **Player**: \`${resulttop5[2].username}\` **Score**: ${resulttop5[2].score} \n [\`${resulttop5[2].maxcombo}\`combo] \`${acc2}\`% \`${resulttop5[2].pp}\`pp miss:${resulttop5[2].countmiss}`, inline: false })
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						interaction.channel.send({ embeds: [embed] })
						return
					} else if (resulttop5.length == 2) {
						acc0 = tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode))
						acc1 = tools.accuracy({300: resulttop5[1].count300, 100: resulttop5[1].count100, 50: resulttop5[1].count50, 0: resulttop5[1].countmiss, geki:  resulttop5[1].countgeki, katu: resulttop5[1].countkatu}, modeconvert(Mapinfo.mode))
							const embed = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
								.setURL(maplink)
								.setAuthor({ name: `Mapped by ${mapperinfo.username}`, iconURL: mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${mapperinfo.user_id}` })								.addFields({ name: "**MapInfo**", value: `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, inline: true })
								.addFields({ name: "\`#1\`", value: `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`, inline: false })
								.addFields({ name: "\`#2\`", value: `**Rank**: \`${resulttop5[1].rank}\` **Player**: \`${resulttop5[1].username}\` **Score**: ${resulttop5[1].score} \n [\`${resulttop5[1].maxcombo}\`combo] \`${acc1}\`% \`${resulttop5[1].pp}\`pp miss:${resulttop5[1].countmiss}`, inline: false })
								.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
							interaction.channel.send({ embeds: [embed] })
						return
					} else {
						acc0 = tools.accuracy({300: resulttop5[0].count300, 100: resulttop5[0].count100, 50: resulttop5[0].count50, 0: resulttop5[0].countmiss, geki:  resulttop5[0].countgeki, katu: resulttop5[0].countkatu}, modeconvert(Mapinfo.mode))
						const embed = new EmbedBuilder()
							.setColor("Blue")
							.setTitle(`Map leaderboard:${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
							.setURL(maplink)
							.setAuthor({ name: `Mapped by ${mapperinfo.username}`, iconURL: mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${mapperinfo.user_id}` })							.addFields("**MapInfo**", `\`Mods\`: **${mods.join("")}** \`SR\`: **${SR.sr}** \`BPM\`: **${BPM}**`, true)
							.addFields({ name: "\`#1\`", value: `**Rank**: \`${resulttop5[0].rank}\` **Player**: \`${resulttop5[0].username}\` **Score**: ${resulttop5[0].score} \n [\`${resulttop5[0].maxcombo}\`combo] \`${acc0}\`% \`${resulttop5[0].pp}\`pp miss:${resulttop5[0].countmiss}`, inline: false })
							.setImage(`https://assets.ppy.sh/beatmaps/${mapsetlink}/covers/cover.jpg`)
						interaction.channel.send({ embeds: [embed] })
						return
					}
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "qf") {
				try {
					const mode = interaction.options.get('mode').value
					const channelid = interaction.channel.id
					const allchannels = fs.readFileSync(`./MapcheckChannels/${mode}/Channels.txt`, "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
					if (allchannels.includes(channelid)) {
						interaction.reply("このチャンネルは既にQualfied、Rankedチェックチャンネルとして登録されています。")
						return
					}
					fs.appendFile(`./MapcheckChannels/${mode}/Channels.txt`, `${channelid} `, function (err) {
						if (err) throw err
					})
					interaction.reply(`このチャンネルを${mode}のQualfied、Rankedチェックチャンネルとして登録しました。`)
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "deqf") {
				try {
					const mode = interaction.options.get('mode').value
					const channelid = interaction.channel.id

					const allchannels = fs.readFileSync(`./MapcheckChannels/${mode}/Channels.txt`, "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
					if (allchannels.includes(channelid)) {
						const currentchannels = fs.readFileSync(`./MapcheckChannels/${mode}/Channels.txt`, "utf-8")
						const newchannels = currentchannels.replace(`${channelid} `, "")
						fs.writeFileSync(`./MapcheckChannels/${mode}/Channels.txt`, newchannels)
					} else {
						interaction.reply("このチャンネルはQualfied、Rankedチェックチャンネルとして登録されていません。")
						return
					}
					interaction.reply(`このチャンネルを${mode}のQualfiedチェックチャンネルから削除しました。`)
				} catch (e){
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "bg") {
				try {
					//メッセージからリンクを取得
					const maplink = interaction.options.get("beatmaplink").value
	
					//osuのbeatmapリンクか判断する
					if (!maplink.startsWith("https://osu.ppy.sh/beatmapsets/")) {
						interaction.reply(`${maplink}、これはマップリンクではない可能性があります。`)
						return
					}
					const BeatmapsetId = await getMapInfowithoutmods(maplink, apikey);
					const BeatmapId = BeatmapsetId.beatmapset_id;
					interaction.channel.send(`https://assets.ppy.sh/beatmaps/${BeatmapId}/covers/raw.jpg`)
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "ifmod") {
				try{
					//ユーザーネームを取得
					let playername;
					try {
						let username = interaction.user.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						interaction.channel.send("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
	
					//メッセージからマップリンクを取得
					const maplink = interaction.options.get("beatmaplink").value;

					if (!maplink.startsWith("https://osu.ppy.sh/beatmapsets/")) {
						interaction.reply(`マップリンクの形式が間違っています。`)
						return
					}
	
					//メッセージからMODを取得
					const modmessage = [interaction.options.get('mods').value.toUpperCase()];
					let modforcalc = splitString(modmessage)
	
					const beatmapId = maplink.split("/")[maplink.split("/").length - 1]
	
					//MODが存在するか、指定できないMODが指定されていないか確認
					if (!checkStrings(modforcalc)) {
						interaction.reply("Modが存在しないか、指定できないModです。")
						return
					}
	
					if((modforcalc.includes("NC") && modforcalc.includes("HT")) || (modforcalc.includes("DT") && modforcalc.includes("HT") || (modforcalc.includes("DT") && modforcalc.includes("NC")) || (modforcalc.includes("EZ") && modforcalc.includes("HR")))) {
						interaction.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
						return
					}
	
					//modsforcalcにDTとNCの両方があった場合の処理
					if (modforcalc.includes("NC")) {
						let modsnotNC = modforcalc.filter((item) => /NC/.exec(item) == null)
						modsnotNC.push("DT")
						modforcalc = modsnotNC
					} else if (modforcalc.length == 0) {
						modforcalc.push("NM")
					}
	
					//マップ情報、スコア情報を取得
					const Mapinfo = await getMapInfowithoutmods(maplink, apikey);
					const playersscore = await getplayerscore(apikey, beatmapId, playername, Mapinfo.mode);
	
					//スコア情報がなかった時の処理
					if (playersscore == undefined) {
						interaction.reply(`${playername}さんのスコアが見つかりませんでした。`)
						return
					}
	
					//マップ情報、プレイヤー情報、マッパー情報を取得
					const Playersinfo = await getplayersdata(apikey, playername, Mapinfo.mode);
	
					//プレイヤーの情報の取得中にエラーが発生した場合の処理
					if (Playersinfo == undefined) {
						interaction.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
						return
					}
	
					const Mapperinfo = await getplayersdata(apikey, Mapinfo.mapper);
	
					//マッパーの情報の取得中にエラーが発生した場合の処理
					if (Mapperinfo == 0) {
						interaction.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
						return
					}
	
					//Accを計算
					const acc = tools.accuracy({300: playersscore.count300.toString(), 100: playersscore.count100.toString(), 50: playersscore.count50.toString(), 0: playersscore.countmiss.toString(), geki : playersscore.countgeki.toString(), katu: playersscore.countgeki.toString()}, modeconvert(Mapinfo.mode));
					
					//Modsを取得
					let stringmodsbefore = playersscore.enabled_mods;
					let stringmodsafter = modforcalc;
	
					//SS時のPPを取得
					const PPbefore = await calculateSRwithacc(beatmapId, stringmodsbefore, modeconvert(Mapinfo.mode), acc, playersscore.countmiss, playersscore.maxcombo);
					const PPafter = await calculateSRwithacc(beatmapId, parseModString(stringmodsafter), modeconvert(Mapinfo.mode), acc, playersscore.countmiss, playersscore.maxcombo);
	
					//表示専用のMod欄を作成
					let showonlymodsforbefore = parseMods(playersscore.enabled_mods);
					if (showonlymodsforbefore.includes("DT") && showonlymodsforbefore.includes("NC")) {
						let modsnotDT = showonlymodsforbefore.filter((item) => item.match("DT") == null)
						showonlymodsforbefore = modsnotDT
					} else if (showonlymodsforbefore.length == 0) {
						showonlymodsforbefore.push("NM")
					}
	
					//モードを取得
					let mode = "";
					let modeforranking = "";
					if (modeconvert(Mapinfo.mode) == "osu") {
						mode = "0"
						modeforranking = "osu"
					} else if (modeconvert(Mapinfo.mode) == "taiko") {
						mode = "1"
						modeforranking = "taiko"
					} else if (modeconvert(Mapinfo.mode) == "catch") {
						mode = "2"
						modeforranking = "fruits"
					} else {
						mode = "3"
						modeforranking = "mania"
					}

					interaction.reply(`${playername}さんのランキングを計算中です。`)
	
					//ユーザー情報、PPなどを取得
					const response = await axios.get(
						`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
					);
					const mapperdata = await getplayersdata(apikey, Mapinfo.mapper, mode);
					const userplays = response.data;
					let pp = [];
					let oldpp = [];
					for (const element of userplays) {
						pp.push(Math.round(element.pp))
						oldpp.push(Math.round(element.pp))
					}
	
					pp.push(Math.round(PPafter.ppwithacc))
					pp.sort((a, b) => b - a)
	
					//PPが変動しないときの処理(101個目のものと同じ場合)
					if (Math.round(PPafter.ppwithacc) == pp[pp.length - 1]) {
						interaction.channel.send("PPに変動は有りません。")
						const embed = new EmbedBuilder()
							.setColor("Blue")
							.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
							.setDescription(`Played by [${playername}](https://osu.ppy.sh/users/${playername})`)
							.addFields({ name: `Mods: ${showonlymodsforbefore.join("")} → ${modmessage.join("")} Acc: ${acc}% Miss: ${playersscore.countmiss}`, value: `**PP:** **${PPbefore.ppwithacc}**/${PPbefore.SSPP}pp → **${PPafter.ppwithacc}**/${PPafter.SSPP}pp`, inline: true })
							.setURL(Mapinfo.maplink)
							.setAuthor({ name: `Mapped by ${Mapinfo.mapper}`, iconURL: `https://a.ppy.sh/${mapperdata.user_id}`, url: `https://osu.ppy.sh/users/${Mapinfo.mapper}` })
							.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
						interaction.channel.send({ embeds: [embed] })
						return
					}
	
					if (pp.indexOf(Math.round(PPbefore.ppwithacc)) == -1) {
						pp.pop()
					} else {
						//ppからPPbeforeを削除
						for (let i = 0; i < pp.length; i++) {
							let foundflag = false;
							if (pp[i] == Math.round(PPbefore.ppwithacc) && !foundflag) {
								foundflag = true;
								pp.splice(i, 1)
							}
							if (foundflag) {
								break;
							}
						}
					}
	
					pp.sort((a, b) => b - a)
	
					//GlobalPPやBonusPPなどを計算する
					const userdata = await getplayersdata(apikey, playername, mode);
					const playcount = userdata.count_rank_ss + userdata.count_rank_ssh + userdata.count_rank_s + userdata.count_rank_sh + userdata.count_rank_a;
					const oldglobalPPwithoutBonusPP = calculateScorePP(oldpp, playcount);
					const globalPPwithoutBonusPP = calculateScorePP(pp, playcount);
					const bonusPP = userdata.pp_raw - oldglobalPPwithoutBonusPP;
					const globalPP = globalPPwithoutBonusPP + bonusPP;
	
					//ランキングを取得
					let ranking = 0;
					await auth.login(osuclientid, osuclientsecret);
					let foundflagforranking = false;
					for (let page = 0; page <= 120; page++) {
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
	
					if(!foundflagforranking) {
						const embed = new EmbedBuilder()
							.setColor("Blue")
							.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
							.setDescription(`Played by [${playername}](https://osu.ppy.sh/users/${playername})`)
							.addFields({ name: `Mods: ${showonlymodsforbefore.join("")} → ${modmessage.join("")} Acc: ${acc}% Miss: ${playersscore.countmiss}`, value: `**PP:** **${PPbefore.ppwithacc}**/${PPbefore.SSPP}pp → **${PPafter.ppwithacc}**/${PPafter.SSPP}pp`, inline: true })
							.setURL(Mapinfo.maplink)
							.setAuthor({ name: `Mapped by ${Mapinfo.mapper}`, iconURL: `https://a.ppy.sh/${mapperdata.user_id}`, url: `https://osu.ppy.sh/users/${Mapinfo.mapper}` })
							.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
							interaction.channel.send({ embeds: [embed] })
						return
					}
	
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
						.setDescription(`Played by [${playername}](https://osu.ppy.sh/users/${playername})`)
						.addFields({ name: `Mods: ${showonlymodsforbefore.join("")} → ${modmessage.join("")} Acc: ${acc}% Miss: ${playersscore.countmiss}`, value: `**PP:** **${PPbefore.ppwithacc}**/${PPbefore.SSPP}pp → **${PPafter.ppwithacc}**/${PPafter.SSPP}pp`, inline: true })
						.addFields({ name: `Rank`, value: `**${userdata.pp_raw}**pp (#${userdata.pp_rank}) → **${globalPP.toFixed(1)}**pp +${(globalPP - userdata.pp_raw).toFixed(1)} (#${ranking} +${userdata.pp_rank - ranking})`, inline: false })
						.setURL(Mapinfo.maplink)
						.setAuthor({ name: `Mapped by ${Mapinfo.mapper}`, iconURL: `https://a.ppy.sh/${mapperdata.user_id}`, url: `https://osu.ppy.sh/users/${Mapinfo.mapper}` })
						.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
						interaction.channel.send({ embeds: [embed] })
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "srchart") {
				try {
					//マップリンクを取得
					const maplink = interaction.options.get("beatmaplink").value;
	
					if (!maplink.startsWith("https://osu.ppy.sh/beatmapsets/")) {
						interaction.reply("マップリンク形式が間違っているようです。")
						return
					}
	
					//マップ情報を取得
					const mapdata = await getMapInfowithoutmods(maplink, apikey);
					const beatmapid = mapdata.beatmapId;
					if (mapdata.combo < 100) {
						interaction.reply("100combo未満のマップは計算できません。")
						return
					} else if (mapdata.combo > 5000) {
						interaction.reply("5000combo以上のマップは計算できません。")
						return
					}
	
					//チャートの作成
					interaction.reply("SRの計算中です。")
					await srchart(beatmapid, modeconvert(mapdata.mode));
					const sr = await calculateSR(beatmapid, 0, modeconvert(mapdata.mode));
					await interaction.channel.send(`**${mapdata.artist} - ${mapdata.title} [${mapdata.version}]**のSRチャートです。最高は${sr.sr}★です。`);
					await interaction.channel.send({ files: [{ attachment: `./BeatmapFolder/${beatmapid}.png`, name: 'SRchart.png' }] });
					fs.remove(`./BeatmapFolder/${beatmapid}.png`);
					fs.remove(`./BeatmapFolder/${beatmapid}.osu`);
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "preview") {
				try {
					//メッセージからマップリンクを取得
					const maplink = interaction.options.get("beatmaplink").value;
	
					//マップリンクではなかった時の処理
					if (!maplink.startsWith("https://osu.ppy.sh/beatmapsets/")) {
						interaction.reply("マップリンク形式が間違っているようです。https://osu.ppy.sh/beatmapsets/で始まるマップリンクを入力してください。")
						return
					}
	
					//マップ情報を取得
					const Mapinfo = await getMapInfowithoutmods(maplink, apikey);
					const beatmapid = Mapinfo.beatmapId;
					const previewlink = `https://osu-preview.jmir.ml/preview#${beatmapid}`
					const SR = await calculateSR(beatmapid, 0, modeconvert(Mapinfo.mode));
	
					//Mapinfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
					let lengthsec;
					if (numDigits(parseFloat(Mapinfo.lengthsec.toFixed(0))) == 1) {
						lengthsec = ('00' + parseFloat(Mapinfo.lengthsec).toFixed(0)).slice(-2)
					} else {
						lengthsec = parseFloat(Mapinfo.lengthsec).toFixed(0)
					}
	
					const mapperdata = await getplayersdata(apikey, Mapinfo.mapper);
	
					//メッセージを作成
					const embed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
						.setDescription(`Combo: \`${Mapinfo.combo}\` Stars: \`${SR.sr}\` \n Length: \`${Mapinfo.lengthmin}:${lengthsec}\` BPM: \`${Mapinfo.bpm}\` Objects: \`${Mapinfo.combo}\` \n CS: \`${Mapinfo.cs}\` AR: \`${Mapinfo.ar}\` OD: \`${Mapinfo.od.toFixed(1)}\` HP: \`${Mapinfo.hp}\` Spinners: \`${Mapinfo.countspinner}\``)
						.setURL(Mapinfo.maplink)
						.setAuthor({ name: `Mapped by ${Mapinfo.mapper}`, iconURL: `https://a.ppy.sh/${mapperdata.user_id}`, url: `https://osu.ppy.sh/users/${Mapinfo.mapper}` })
						.addFields({ name: "Preview link", value: `[Preview this map!](${previewlink})`, inline: true })
						.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
					interaction.channel.send({ embeds: [embed] })
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "osubgquiz") {
				try {
					//クイズが既に開始しているかをファイルの存在から確認する
					if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
						interaction.reply("既にクイズが開始されています。!quizendで終了するか回答してください。")
						return
					}

					const username = interaction.options.get('username').value
					const mode = interaction.options.get('mode').value
	
					//クイズの問題を取得
					const quiz = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${modeconvert(mode)}&limit=100`);
					const quizdata = quiz.data;
					if (quizdata.length < 10) {
						interaction.reply("クイズの問題を取得できませんでした。")
						return
					}
	
					//0-99までのランダムな数字を10個取得
					const randomnumber = [];
					while (randomnumber.length < 10) {
						const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
						if (!randomnumber.includes(randomNumber)) {
							randomnumber.push(randomNumber)
						}
					}
	
					//ランダムな数字からランダムなマップを取得
					const randommap = [];
					const randommaptitle = [];
					for (const element of randomnumber) {
						const beatmapsetid = await getMapforRecent(quizdata[element].beatmap_id, apikey, "NM");
						randommap.push(beatmapsetid.beatmapset_id)
						randommaptitle.push(beatmapsetid.title)
					}
					
					let randomjson = JSON.parse("[]");
					for (let i = 0; i < randommap.length; i++) {
						randomjson.push({"mode": "BG", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": false, "Answerer": "", "hint": false})
					}
					fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4))
					const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
					interaction.reply("クイズを開始します。問題は10問です。")
					interaction.channel.send(`問題1のBGを表示します。`)
					const response = await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
					const BGdata = response.data;
					interaction.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "osubgquizpf") {
				try {
					//クイズが既に開始しているかをファイルの存在から確認する
					if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
						interaction.reply("既にクイズが開始されています。!quizendで終了するか回答してください。")
						return
					}

					const username = interaction.options.get('username').value
					const mode = interaction.options.get('mode').value
	
					//クイズの問題を取得
					const quiz = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${modeconvert(mode)}&limit=100`);
					const quizdata = quiz.data;
					if (quizdata.length < 10) {
						interaction.reply("クイズの問題を取得できませんでした。")
						return
					}
	
					//0-99までのランダムな数字を10個取得
					const randomnumber = [];
					while (randomnumber.length < 10) {
						const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
						if (!randomnumber.includes(randomNumber)) {
							randomnumber.push(randomNumber)
						}
					}
	
					//ランダムな数字からランダムなマップを取得
					const randommap = [];
					const randommaptitle = [];
					for (const element of randomnumber) {
						const beatmapsetid = await getMapforRecent(quizdata[element].beatmap_id, apikey, "NM");
						randommap.push(beatmapsetid.beatmapset_id)
						randommaptitle.push(beatmapsetid.title)
					}
					
					let randomjson = JSON.parse("[]");
					for (let i = 0; i < randommap.length; i++) {
						randomjson.push({"mode": "BG", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": true, "Answerer": "", "hint": false})
					}
					fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4))
					const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
					interaction.reply("クイズを開始します。問題は10問です。")
					interaction.channel.send(`問題1のBGを表示します。`)
					const response = await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
					const BGdata = response.data;
					interaction.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "osuquiz") {
				try {
					//クイズが既に開始しているかをファイルの存在から確認する
					if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
						interaction.reply("既にクイズが開始されています。!quizendで終了するか回答してください。")
						return
					}

					const username = interaction.options.get('username').value
					const mode = interaction.options.get('mode').value
	
					//クイズの問題を取得
					const quiz = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${modeconvert(mode)}&limit=100`);
					const quizdata = quiz.data;
					if (quizdata.length < 10) {
						interaction.reply("クイズの問題を取得できませんでした。")
						return
					}
	
					//0-99までのランダムな数字を10個取得
					const randomnumber = [];
					while (randomnumber.length < 10) {
						const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
						if (!randomnumber.includes(randomNumber)) {
							randomnumber.push(randomNumber)
						}
					}
	
					//ランダムな数字からランダムなマップを取得
					const randommap = [];
					const randommaptitle = [];
					for (const element of randomnumber) {
						const beatmapsetid = await getMapforRecent(quizdata[element].beatmap_id, apikey, "NM");
						randommap.push(beatmapsetid.beatmapset_id)
						randommaptitle.push(beatmapsetid.title)
					}
					
					let randomjson = JSON.parse("[]");
					for (let i = 0; i < randommap.length; i++) {
						randomjson.push({"mode": "pre", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": false, "Answerer": "", "hint": false})
					}
					fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4))
					const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
					interaction.reply("クイズを開始します。問題は10問です。")
					interaction.channel.send(`問題1のBGを表示します。`)
					const response = await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
					const BGdata = response.data;
					interaction.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "osuquizpf") {
				try {
					//クイズが既に開始しているかをファイルの存在から確認する
					if (fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
						interaction.reply("既にクイズが開始されています。!quizendで終了するか回答してください。")
						return
					}

					const username = interaction.options.get('username').value
					const mode = interaction.options.get('mode').value
	
					//クイズの問題を取得
					const quiz = await axios.get(`https://osu.ppy.sh/api/get_user_best?k=${apikey}&u=${username}&type=string&m=${modeconvert(mode)}&limit=100`);
					const quizdata = quiz.data;
					if (quizdata.length < 10) {
						interaction.reply("クイズの問題を取得できませんでした。")
						return
					}
	
					//0-99までのランダムな数字を10個取得
					const randomnumber = [];
					while (randomnumber.length < 10) {
						const randomNumber = Math.floor(Math.random() * Math.min(quizdata.length, 100));
						if (!randomnumber.includes(randomNumber)) {
							randomnumber.push(randomNumber)
						}
					}
	
					//ランダムな数字からランダムなマップを取得
					const randommap = [];
					const randommaptitle = [];
					for (const element of randomnumber) {
						const beatmapsetid = await getMapforRecent(quizdata[element].beatmap_id, apikey, "NM");
						randommap.push(beatmapsetid.beatmapset_id)
						randommaptitle.push(beatmapsetid.title)
					}
					
					let randomjson = JSON.parse("[]");
					for (let i = 0; i < randommap.length; i++) {
						randomjson.push({"mode": "pre", "number": i + 1, "id": randommap[i], "name": randommaptitle[i].replace(/\([^)]*\)/g, "").trimEnd(), "quizstatus": false, "Perfect": true, "Answerer": "", "hint": false})
					}
					fs.writeFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, JSON.stringify(randomjson, null, 4))
					const jsondata = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"));
					interaction.reply("クイズを開始します。問題は10問です。")
					interaction.channel.send(`問題1のBGを表示します。`)
					const response = await axios.get(`https://assets.ppy.sh/beatmaps/${jsondata[0].id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
					const BGdata = response.data;
					interaction.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "quizend") {
				try {
					if (!fs.existsSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)) {
						interaction.reply("クイズが開始されていません。")
						return
					}
					const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${interaction.channel.id}.json`, "utf-8"))
					let answererstring = ""
					for (let i = 0; i < answererarray.length; i++) {
						if (answererarray[i].Answerer == "") continue;
						if (answererarray[i].hint) {
							answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`
						} else {
							answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
						}
					}
					interaction.reply(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
					fs.removeSync(`./OsuPreviewquiz/${interaction.channel.id}.json`)
					return
				} catch (e) {
					console.log(e)
					interaction.channel.send("コマンドの処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "slayer") {
				try {
					//メッセージからユーザー名を取得
					const username = interaction.options.get('username').value
	
					//メッセージからスレイヤーのIDを取得
					const slayerid = interaction.options.get('slayername').value
	
					//メッセージからプロファイル番号を取得
					const i = interaction.options.get('profileid').value
	
					//プロファイル番号が数字かどうかの処理
					if (!/^[\d.]+$/g.test(i)) {
						interaction.reply("プロファイル番号は数字のみで入力してください。")
						return
					}
	
					//ユーザー名からUUIDを取得
					let useruuidresponce
					useruuidresponce = await axios.get(
						`https://api.mojang.com/users/profiles/minecraft/${username}`
					).catch(()=> {
						useruuidresponce = undefined
					});
	
					////ユーザーが存在しなかった場合の処理
					if (useruuidresponce == undefined) {
						interaction.reply("ユーザー名が間違っているか、Mojang APIがダウンしている可能性があります。")
						return
					}
	
					//先程取得したUUIDからプロファイル情報を取得
					const responce = await axios.get(
						`https://api.hypixel.net/skyblock/profiles?key=${hypixelapikey}&uuid=${useruuidresponce.data.id}`
					);
	
					//プロファイル情報が取得できなかった場合の処理
					if (!responce.data.success) {
						interaction.reply("データを取得するのに失敗しました。")
						return
					}else if (responce.data.profiles == null) {
						interaction.reply("このユーザーはSkyblockをしていないようです。")
						return
					}
	
					//スレイヤーのIDからスレイヤーの名前を取得
					let slayername;
					if (slayerid == "Revenant Horror") {
						slayername = "zombie"
					} else if (slayerid == "Tarantula Broodfather") {
						slayername = "spider"
					} else if (slayerid == "Sven Packmaster") {
						slayername = "wolf"
					} else if (slayerid == "Voidgloom Seraph") {
						slayername = "enderman"
					} else if (slayerid == "Inferno Demonlord") {
						slayername = "blaze"
					} else if (slayerid == "Riftstalker Bloodfiend") {
						interaction.reply("このスレイヤーの処理機能はまだ実装されていません。")
						return
					} else {
						interaction.reply("スレイヤーのIDが不正です。")
						return
					}
	
					//スレイヤーの名前から表示用のスレイヤーの名前を取得
					let showonlyslayername;
					if (slayername == "zombie") {
						showonlyslayername = "ゾンスレ"
					} else if (slayername == "spider") {
						showonlyslayername = "クモスレ"
					} else if (slayername == "wolf") {
						showonlyslayername = "ウルフスレ"
					} else if (slayername == "enderman") {
						showonlyslayername = "エンスレ"
					} else if (slayername == "blaze") {
						showonlyslayername = "ブレイズスレ"
					}
	
					//プロファイルが存在しなかった場合の処理
					if (responce.data.profiles[i] == undefined) {
						interaction.reply("このプロファイルは存在しないようです。")
						return
					}
	
					//取得したデータからユーザーの指定したプロファイルのスレイヤーのXPを取得
					const userslayerxp = eval(`responce.data.profiles[${i}].members.${useruuidresponce.data.id}.slayer_bosses.${slayername}.xp`);
	
					//スレイヤーのXPが存在しなかった場合の処理(未プレイとされる)
					if (userslayerxp == undefined) {
						interaction.reply(`プロファイル:${responce.data.profiles[i].cute_name} | このプレイヤーは${showonlyslayername}をしていないみたいです。`)
						return
					}
	
					//スレイヤーXPなどの計算をし、メッセージを送信する
					if (userslayerxp >= 1000000) {
						interaction.reply(`プロファイル:${responce.data.profiles[i].cute_name} | このプレイヤーの${showonlyslayername}レベルは既に**Lv9**です。`)
						return
					} else if (userslayerxp >= 400000) {
						const remainxp = 1000000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv8**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1000000 * 100).toFixed(1))}${(userslayerxp / 1000000 * 100).toFixed(1)}%`)
					} else if (userslayerxp >= 100000) {
						const remainxp = 400000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv7**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 400000 * 100).toFixed(1))}${(userslayerxp / 400000 * 100).toFixed(1)}%`)
					} else if (userslayerxp >= 20000) {
						const remainxp = 100000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv6**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 100000 * 100).toFixed(1))}${(userslayerxp / 100000 * 100).toFixed(1)}%`)
					} else if (userslayerxp >= 5000) {
						const remainxp = 20000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv5**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 20000 * 100).toFixed(1))}${(userslayerxp / 20000 * 100).toFixed(1)}%`)
					} else if (((slayername == "zombie" || slayername == "spider") && userslayerxp >= 1000) || ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 1500)) {
						const remainxp = 5000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv4**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 5000 * 100).toFixed(1))}${(userslayerxp / 5000 * 100).toFixed(1)}%`)
					} else if ((slayername == "zombie" || slayername == "spider") && userslayerxp >= 200) {
						const remainxp = 1000 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1000 * 100).toFixed(1))}${(userslayerxp / 1000 * 100).toFixed(1)}%`)
					} else if ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 250) {
						const remainxp = 1500 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv3**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 1500 * 100).toFixed(1))}${(userslayerxp / 1500 * 100).toFixed(1)}%`)
					} else if ((slayername == "zombie" && userslayerxp >= 15) || (slayername == "spider" && userslayerxp >= 25)) {
						const remainxp = 200 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 200 * 100).toFixed(1))}${(userslayerxp / 200 * 100).toFixed(1)}%`)
					} else if ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 30) {
						const remainxp = 250 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv2**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 250 * 100).toFixed(1))}${(userslayerxp / 250 * 100).toFixed(1)}%`)
					} else if ((slayername == "zombie" || slayername == "spider") && userslayerxp >= 5) {
						let remainxp = 0
						if (slayername == "zombi") {
							remainxp = 15 - userslayerxp
							interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv1**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 15 * 100).toFixed(1))}${(userslayerxp / 15 * 100).toFixed(1)}%`)
						} else if (slayername == "spider") {
							remainxp = 25 - userslayerxp
							interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv1**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 25 * 100).toFixed(1))}${(userslayerxp / 25 * 100).toFixed(1)}%`)
						}
					} else if ((slayername == "wolf" || slayername == "enderman" || slayername == "blaze") && userslayerxp >= 10) {
						const remainxp = 30 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | 現在の${showonlyslayername}レベルは**Lv1**です。次のレベルまでに必要なXPは${remainxp}です。\n次のレベルまでの周回回数 | T1: ${Math.ceil(remainxp / 5)}回 | T2: ${Math.ceil(remainxp / 25)}回 | T3: ${Math.ceil(remainxp / 100)}回 | T4: ${Math.ceil(remainxp / 500)}回 | T5: ${Math.ceil(remainxp / 1500)}回 |\n${createProgressBar((userslayerxp / 30 * 100).toFixed(1))}${(userslayerxp / 30 * 100).toFixed(1)}%`)
					} else {
						const remainxp = 5 - userslayerxp
						interaction.reply(`プロファイル:**${responce.data.profiles[i].cute_name}** | このプレイヤーの${showonlyslayername}はLv1に達していません。次のレベルまでに必要なXPは${remainxp}です。`)
					}
				} catch(e) {
					console.log(e)
					interaction.reply("コマンド処理中になんらかのエラーが発生しました。Hypixelのサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "profile") {
				try {
					//メッセージからユーザー名を取得
					const username = interaction.options.get('username').value
	
					//ユーザー名が入力されてなかった時、の処理
					if (username == undefined) {
						interaction.reply("ユーザー名を入力してください。")
						return
					}
	
					//ユーザー名の前の空白が1つ多かった時の処理
					if (username == "") {
						interaction.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
	
					//ユーザー名からUUIDを取得
					let useruuidresponce
					useruuidresponce = await axios.get(
						`https://api.mojang.com/users/profiles/minecraft/${username}`
					).catch(()=> {
						useruuidresponce = undefined
					});
	
					//ユーザーが存在しなかった場合の処理
					if (useruuidresponce == undefined) {
						interaction.reply("ユーザー名が間違っているか、Mojang APIがダウンしている可能性があります。")
						return
					}
	
					//先程取得したUUIDからプロファイル情報を取得
					const responce = await axios.get(
						`https://api.hypixel.net/skyblock/profiles?key=${hypixelapikey}&uuid=${useruuidresponce.data.id}`
					);
	
					//プロファイル情報が取得できなかった場合の処理
					if (!responce.data.success) {
						interaction.reply("データを取得するのに失敗しました。")
						return
					}else if (responce.data.profiles == null) {
						interaction.reply("このユーザーはSkyblockをしていないようです。")
						return
					}
	
					//メッセージ内容を作成する処理
					let showprofilemessage = ["__**プロファイル一覧**__"];
					let showonlyselected;
					for (let i = 0; i < responce.data.profiles.length; i++) {
						if (responce.data.profiles[i].selected) {
							showonlyselected = "✅"
						} else {
							showonlyselected = "❌"
						}
						showprofilemessage.push(`**${i}**: ${responce.data.profiles[i].cute_name} | 選択中: ${showonlyselected}`)
					}
					interaction.reply(showprofilemessage.join("\n"));
				} catch(e) {
					console.log(e)
					interaction.reply("コマンド処理中になんらかのエラーが発生しました。Hypixelのサーバーエラーか、サーバーのネットワークの問題かと思われます。")
					return
				}
			}

			if (interaction.commandName == "loc") {
				try {
					//メッセージからユーザー名を取得
					const username = interaction.options.get('Username').value;
	
					//メッセージからリポジトリ名を取得
					const reponame = interaction.options.get('Repository').value;

					interaction.reply("LOCの計算中です。")
					let error = false;
					let locdata = await axios.get(`https://api.codetabs.com/v1/loc?github=${username}/${reponame}`).catch(()=> {
						error = true;
					})
					if (error) {
						interaction.reply("データを取得するのに失敗しました。")
						return
					}
					const data = locdata.data
					let totalfilecount;
					let totalline;
					let totalblanks;
					let comments;
					let totalLOC;
					for (const element of data) {
						if (element.language === 'Total') {
							totalfilecount = element.files
							totalline = element.lines
							totalblanks = element.blanks
							comments = element.comments
							totalLOC = element.linesOfCode
						}
					}
					interaction.reply(`リポジトリ: **${username}/${reponame}**\nファイル数: **${totalfilecount}**\n総行数: **${totalline}**\n空白行数: **${totalblanks}**\nコメント行数: **${comments}**\n---------------\nコード行数: **${totalLOC}**`)
				} catch(e) {
					console.log(e)
					interaction.reply("コマンド処理中になんらかのエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "backup") {
				try {
					//管理者のみ実行するようにする
					if (interaction.user.id != BotadminId) {
						interaction.reply("このコマンドはBOT管理者のみ実行できます。")
						return
					}

					const backuptime = interaction.options.get('backuptime').value;
	
					//バックアップファイルの中身を取得
					const backupfiles = fs.readdirSync("./Backups").reverse()
					const wannabackuptime = backuptime - 1
					const wannabackup = backupfiles[wannabackuptime]
	
					//バックアップファイルが存在しなかった時の処理
					if (wannabackup == undefined) {
						interaction.reply("その期間のバックアップファイルは存在しません。")
						return
					}

					//復元作業
					interaction.reply(`${wannabackup}のバックアップを復元中です。(0%)`);
					await fs.copy(`./Backups/${wannabackup}/Player infomation`,`./Player infomation`);
					interaction.channel.send("Player infomationフォルダの復元が完了しました。(20%)");
					await fs.copy(`./Backups/${wannabackup}/MapcheckChannels`,`./MapcheckChannels`);
					interaction.channel.send("MapcheckChannelsフォルダの復元が完了しました。(40%)");
					await fs.copy(`./Backups/${wannabackup}/BeatmapLinkChannels`,`./BeatmapLinkChannels`);
					interaction.channel.send("BeatmapLinkChannelsフォルダの復元が完了しました。(60%)");
					await fs.copy(`./Backups/${wannabackup}/Player Bank`, `./Player Bank`);
					interaction.channel.send("Player Bankフォルダの復元が完了しました。(80%)");
					await fs.copy(`./Backups/${wannabackup}/tag`, `./tag`);
					await fs.copy(`./Backups/${wannabackup}/quotetag`, `./quotetag`);
					interaction.channel.send("tagフォルダの復元が完了しました。(100%)");
					interaction.channel.send(`${wannabackup}のバックアップの全ての復元が完了しました。`)
				} catch (e) {
					console.log(e)
					interaction.channel.send("バックアップの復元中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "update") {
				try {
					//管理者のみ実行するようにする
					if (interaction.user.id != BotadminId) {
						interaction.reply("このコマンドはBOT管理者のみ実行できます。")
						return
					}
	
					//更新処理
					interaction.reply("更新中です。");
	
					//ファイルの指定、保存先の指定
					const fileUrl = Githuburl;
					const savePath = botfilepath;
	
					//ファイルのダウンロード
					interaction.channel.send("ファイルのダウンロード中です。")
					downloadHoshinobotFile(fileUrl, savePath, (error) => {
						if (error) {
							interaction.channel.send("ファイルのダウンロードに失敗しました。");
						} else {
							getCommitDiffofHoshinobot(owner, repo, file, (error, diff) => {
								if (error) {
									console.log(error);
									interaction.channel.send("ファイルのアップデートに成功しました。\nアップデート内容: 取得できませんでした。");
								} else {
									interaction.channel.send(`ファイルのアップデートに成功しました。\n最新のアップデート内容: **${diff}**\n※アップデート後はPM2上でサーバーの再起動をしてください。`);
								}
							});
						}
					});
				} catch (e) {
					console.log(e)
					interaction.channel.send("更新中にエラーが発生しました。")
					return
				}
			}

			if (interaction.commandName == "allupdate") {
				try {
					//管理者のみ実行するようにする
					if (interaction.user.id != BotadminId) {
						interaction.reply("このコマンドはBOT管理者のみ実行できます。")
						return
					}

					interaction.reply("更新中です。");
	
					//更新処理
					interaction.channel.send("Updateフォルダをリセットしています。")
					await fs.remove('./updatetemp');
					interaction.channel.send("Updateフォルダのリセットが完了しました。")
					interaction.channel.send("リポジトリのクローン中です。");
					git(`https://github.com/${owner}/${repo}.git`, './updatetemp', {}, (error) => {
						if (error) {
							console.log(error);
							interaction.channel.send("リポジトリのクローン時に失敗しました");
							return;
						}
	
						interaction.channel.send("リポジトリのクローンが完了しました。");
	
						// ファイルとフォルダのコピー
						const sourceDir = './updatetemp';
						const destinationDir = './';
						const excludedFiles = ['(dotenv).env'];
						const excludedFolders = ['quotetag', 'OsuPreviewquiz', 'Backups', 'BeatmapFolder', 'BeatmapLinkChannels', 'Furry', 'Player Bank', 'Player infomation', 'QualfiedBeatmaps', 'RankedBeatmaps', 'MapcheckChannels', 'tag', 'updatetemp'];
	
						fs.readdir(sourceDir, (err, files) => {
							interaction.channel.send("ディリクトリを読み込んでいます。")
							if (err) {
								console.log(err);
								interaction.channel.send("ディレクトリの読み込み中にエラーが発生しました");
								return;
							}
							interaction.channel.send("ディリクトリの読み込みが完了しました。")
	
							//ファイルのコピー
							const copyFile = (src, dest) => {
								if (!excludedFiles.includes(path.basename(src))) {
									fs.copy(src, dest)
									.catch((err) => {
										throw err;
									});
								}
							};
	
							//フォルダのコピー
							const copyFolder = (src, dest) => {
								if (!excludedFolders.includes(path.basename(src))) {
									fs.copy(src, dest)
									.catch((err) => {
										throw err;
									});
								}
							};
	
							interaction.channel.send("ファイルのコピー中です。")
	
							files.forEach((file) => {
								const srcPath = path.join(sourceDir, file);
								const destPath = path.join(destinationDir, file);
								try {
									if (fs.lstatSync(srcPath).isDirectory()) {
										copyFolder(srcPath, destPath);
									} else {
										copyFile(srcPath, destPath);
									}
								} catch (err) {
									console.log(err);
									interaction.channel.send("ファイルのコピー中にエラーが発生しました。")
									return;
								}
							});
	
							getCommitDiffofHoshinobot(owner, repo, file, (error, diff) => {
								if (error) {
									console.log(error);
									interaction.channel.send("全ファイルのアップデートに成功しました。\nアップデート内容: 取得できませんでした。");
								} else {
									interaction.channel.send(`全ファイルのアップデートに成功しました。\n最新のアップデート内容: **${diff}**\n※アップデート後はPM2上でサーバーの再起動をしてください。`);
								}
							});
						});
					});
				} catch (e) {
					console.log(e)
					interaction.channel.send("更新中にエラーが発生しました。")
					return
				}
			}
		} catch(e) {
			console.log(e)
			return
		}
	}
);

client.on(Events.MessageCreate, async (message) =>
	{
		//特定のチェンネルに添付画像などが送られたら実行する処理(FurryBOT)
		if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.endsWith('.avi') || attachment.url.endsWith('.mov') || attachment.url.endsWith('.mp4') || attachment.url.endsWith('.png') || attachment.url.endsWith('.jpg') || attachment.url.endsWith('.gif')) && message.channel.id == Furrychannel) {
			try {
				//Botが送った画像に対しての処理をブロック
				if (message.author.bot) return;

				//画像のURLを取得
				const attachment = message.attachments.first();
				const imageURL = attachment.url;

				//画像のURLをテキストファイルに保存
				fs.appendFile(`./Furry/Furry.txt`, `${imageURL} `, function (err) {
					if (err) throw err
				})

				//画像の保存が完了したことを知らせるメッセージを送信
				message.reply(`Furryが保存されました`);
			} catch (e) {
				console.log(e)
				message.reply("ファイルの保存中にエラーが発生しました。")
				return
			}
		}

		//画像が送信された時の処理(All picture Bot)
		if (message.attachments.size > 0 && message.attachments.every(attachment => attachment.url.endsWith('.avi') || attachment.url.endsWith('.mov') || attachment.url.endsWith('.mp4') || attachment.url.endsWith('.png') || attachment.url.endsWith('.jpg') || attachment.url.endsWith('.gif'))) {
			try {
				//Botが送った画像に対しての処理をブロック
				if (message.author.bot) return;

				//写真が送信されたチャンネルがタグとして登録されてなかった場合の処理
				if (!fs.existsSync(`./tag/${message.channel.name}/picture.txt`)) return;

				//画像のURLを取得
				const attachment = message.attachments.first();
				const imageURL = attachment.url;

				//画像のURLをテキストファイルに保存
				fs.appendFile(`./tag/${message.channel.name}/picture.txt`, `${imageURL} `, function (err) {
					if (err) throw err
				})

				//画像の保存が完了したことを知らせるメッセージを送信
				message.reply(`ファイルが保存されました`);
			} catch (e) {
				console.log(e)
				message.reply("ファイルの保存中にエラーが発生しました。")
				return
			}
		}

		//メッセージが送信された時の処理(Quote Bot)
		if (fs.existsSync(`./quotetag/${message.channel.name}/quote.txt`) && !message.content.startsWith("!")) {
			try {
				//Botが送ったメッセージに対しての処理をブロック
				if (message.author.bot) return;

				//画像のURLをテキストファイルに保存
				fs.appendFile(`./quotetag/${message.channel.name}/quote.txt`, `${message.content.replace(" ", "")} `, function (err) {
					if (err) throw err
				})

				//画像の保存が完了したことを知らせるメッセージを送信
				message.reply(`名言が保存されました`);
			} catch (e) {
				console.log(e)
				message.reply("名言の保存中にエラーが発生しました。")
				return
			}
		}

		//!mapコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!map") {
			try {
				//コマンドのみ入力された場合の処理
				if (message.content == "!map") {
					message.reply("使い方: !s <マップリンク> <Mods(省略可)> <Acc(省略可)>")
					return
				}

				//メッセージからマップリンクを取得
				const MessageMaplink = message.content.split(" ")[1];

				//マップリンクの前の空白が1つ多い場合の処理
				if (MessageMaplink == "") {
					message.reply("マップリンクの前の空白が1つ多い可能性があります。")
					return
				}

				//マップリンクが入力されてない場合の処理
				if (MessageMaplink == undefined) {
					message.reply("マップリンクを入力してください。")
					return
				}

				//Arg2がModかAccか、なにも入力されてないかを判別する処理
				let arg2;
				let arg3;
				if (message.content.split(" ")[2] == undefined) {
					arg2 = "nothing"
				} else if (/^[a-zA-Z]+$/.test(message.content.split(" ")[2])) {
					arg2 = "mod"
				} else if (/^[\d.]+$/g.test(message.content.split(" ")[2])) {
					arg2 = "acc"
				} else if (message.content.split(" ")[2] == "") {
					message.reply("Mods, Acc欄の前に空白が一つ多い可能性があります。")
					return
				} else {
					message.reply("Mods, Acc欄には数字かModのみを入力してください。")
					return
				}

				//Arg3がAccか、なにも入力されてないかを判別する処理
				if (message.content.split(" ")[3] == undefined) {
					arg3 = "nothing"
				} else if (/^[\d.]+$/g.test(message.content.split(" ")[3])) {
					arg3 = "acc";
				} else if (message.content.split(" ")[3] == "") {
					message.reply("Acc欄の前に空白が一つ多い可能性があります。")
					return
				} else {
					message.reply("Acc欄には数字のみを入力してください。")
					return
				}

				//Arg2がModの場合の処理
				let Mods = [];
				if (arg2 == "nothing") {
					Mods.push("NM")
				} else if (arg2 == "mod") {
					Mods = [message.content.split(" ")[2].toUpperCase()];
					Mods = splitString(Mods);
					if (!checkStrings(Mods)) {
						message.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。")
						return
					}

					if((Mods.includes("NC") && Mods.includes("HT")) || (Mods.includes("DT") && Mods.includes("HT") || (Mods.includes("DT") && Mods.includes("NC")) || (Mods.includes("EZ") && Mods.includes("HR")))) {
						message.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
						return
					}

					if (Mods.includes("NC")) {
						Mods.push("DT")
						let modsnotNC = Mods.filter((item) => /NC/.exec(item) == null)
						Mods = modsnotNC
					}
				}

				//マップ情報を取得
				const MapInfo = await getMapInfo(MessageMaplink, apikey, Mods);

				//BPMを取得、計算
				let BPM = MapInfo.bpm;
				if (Mods.includes("DT")) {
					BPM *= 1.5
				} else if (Mods.includes("HT")) {
					BPM *= 0.75
				}

				//マッパーやppなどを取得
				const mapperdata = await getplayersdata(apikey, MapInfo.mapper);

				if (mapperdata == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				const Modsconverted = parseModString(Mods);
				const srpps = await calculateSR(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode));
				const Mapstatus = mapstatus(MapInfo.approved);

				//MapInfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(MapInfo.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + MapInfo.lengthsec.toString()).slice(-2)
				} else {
					lengthsec = parseFloat(MapInfo.lengthsec.toString()).toFixed(0)
				}

				//PP欄を桁数を基に整形
				for (let i = 0; i < 4; i++) {
					const value = parseFloat(srpps['S' + i]).toFixed(2)
					const numDigits = value.length
					let result = ''
					if (numDigits >= 7) {
						result = `  ${value} `
					} else if (numDigits == 6) {
						result = `  ${value}  `
					} else if (numDigits == 5) {
						result = `  ${value}   `
					} else if (numDigits == 4) {
						result = `   ${value}   `
					}
					srpps['S' + i] = result
				}

				//表示専用のmod欄を作成
				let Showonlymods = [];
				if (arg2 == "mod") {
					Showonlymods = message.content.split(" ")[2].toUpperCase()
				} else {
					Showonlymods.push("NM")
				}

				//ODを計算
				let od = ODscaled(MapInfo.od, Mods);

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${MapInfo.artist} - ${MapInfo.title}`)
					.setURL(MapInfo.maplink)
					.addFields({ name: "Music and Backgroud", value: `:musical_note:[Song Preview](https://b.ppy.sh/preview/${MapInfo.beatmapset_id}.mp3) :frame_photo:[Full background](https://assets.ppy.sh/beatmaps/${MapInfo.beatmapset_id}/covers/raw.jpg)` })
					.setAuthor({ name: `Created by ${MapInfo.mapper}`, iconURL: mapperdata.iconurl, url: mapperdata.playerurl })
					.addFields({ name: `[**__${MapInfo.version}__**] **+${Showonlymods}**`, value: `Combo: \`${MapInfo.combo}\` Stars: \`${srpps.sr}\` \n Length: \`${MapInfo.lengthmin}:${lengthsec}\` BPM: \`${BPM}\` Objects: \`${MapInfo.combo}\` \n CS: \`${MapInfo.cs}\` AR: \`${MapInfo.ar}\` OD: \`${od.toFixed(1)}\` HP: \`${MapInfo.hp}\` Spinners: \`${MapInfo.countspinner}\``, inline: true })
					.addFields({ name: "**Download**", value: `[Official](https://osu.ppy.sh/beatmapsets/${MapInfo.beatmapset_id}/download)\n[Nerinyan(no video)](https://api.nerinyan.moe/d/${MapInfo.beatmapset_id}?nv=1)\n[Beatconnect](https://beatconnect.io/b/${MapInfo.beatmapset_id})\n[chimu.moe](https://api.chimu.moe/v1/download/${MapInfo.beatmapset_id}?n=1)`, inline: true })
					.addFields({ name: `:heart: ${MapInfo.favouritecount} :play_pause: ${MapInfo.playcount}`, value: `\`\`\` Acc |    98%   |    99%   |   99.5%  |   100%   | \n ----+----------+----------+----------+----------+  \n  PP |${srpps.S3}|${srpps.S2}|${srpps.S1}|${srpps.S0}|\`\`\``, inline: false })
					.setImage(`https://assets.ppy.sh/beatmaps/${MapInfo.beatmapset_id}/covers/cover.jpg`)
					.setFooter({ text: `${Mapstatus} mapset of ${MapInfo.mapper}` })
				message.channel.send({ embeds: [embed] })

				//Arg2、Arg3にAccが入力された場合に送信されるメッセージの内容の処理
				if (arg2 == "acc") {
					let accpp = await calculateSRwithacc(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode), parseFloat(message.content.split(" ")[2]), 0,  MapInfo.combo)
					message.reply(`**${Showonlymods}**で**${message.content.split(" ")[2]}%**を取った時のPPは__**${accpp.ppwithacc}pp**__です。`)
				} else if (arg3 == "acc") {
					let accpp = await calculateSRwithacc(MapInfo.beatmapId, Modsconverted, modeconvert(MapInfo.mode), parseFloat(message.content.split(" ")[3]), 0,  MapInfo.combo)
					message.reply(`**${Showonlymods}**で**${message.content.split(" ")[3]}%**を取った時のPPは__**${accpp.ppwithacc}pp**__です。`)
				}
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//!roコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!ro") {
			try {
				//ユーザー名が入力されなかったときの処理、されたときの処理
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					try {
						let username = message.author.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
				} else {
					playername = message.content.split(" ")[1]
					if (playername == undefined) {
						message.reply("メッセージからユーザー名を取得するのに失敗しました。")
						return
					} else if (playername == "") {
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
				}

				//ユーザー名からRecentplayを情報を取得
				const recentplay = await Recentplay(apikey, playername, 0);
				if (recentplay == undefined) {
					message.reply(`${playername}さんには24時間以内にプレイしたosu!譜面がないようです。`)
					return
				}

				//Recentplayの情報から必要な情報を取得
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);

				//プレイヤーの情報の取得中にエラーが発生した場合の処理
				if (playersdata == undefined) {
					message.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
					return
				}

				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);

				//マッパーの情報の取得中にエラーが発生した場合の処理
				if (mappersdata == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				//Accを計算
				const acc = tools.accuracy({300: recentplay.count300.toFixed(0), 100: recentplay.count100.toFixed(0), 50: recentplay.count50.toFixed(0), 0: recentplay.countmiss.toFixed(0), geki: recentplay.countgeki.toFixed(0), katu: recentplay.countkatu.toFixed(0)}, "osu");
				
				//BPMを取得、計算
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);

				//Mod、BPMの処理
				if (mods.includes("NC")) {
					let modsnotNC = mods.filter((item) => item.match("NC") == null)
					mods = modsnotNC
					modsforcalc = parseModString(mods)
					BPM *= 1.5
				} else if (mods.includes("HT")) {
					BPM *= 0.75
				}

				//SR、IfFCの精度(300や100)を計算
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if (recentplay.countmiss == 0) {
					ifFC100 = recentplay.count100 + recentplay.count50
				} else {
					ifFC100 = recentplay.count100 + recentplay.countmiss + recentplay.count50
				}
				let ifFC300;
				if (recentplay.countmiss > 0) {
					ifFC300 = GetMapInfo.combo + recentplay.count100  - recentplay.countmiss
				} else {
					ifFC300 = GetMapInfo.combo - recentplay.count300 + recentplay.count100 + recentplay.count300
				}

				//IfFCの精度(300や100)からAccを計算
				const ifFCacc = tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: "0", 0: "0", geki: "0", katu: "0"}, "osu");

				//Mapstatusを取得(Ranked, Loved, Qualified, Pending, WIP, Graveyard)
				const Mapstatus = mapstatus(GetMapInfo.approved);

				//RecentplayのPP、IfFCのPPを計算
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, parseInt(recentplay.countmiss), parseInt(recentplay.maxcombo));
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, parseInt(GetMapInfo.combo));
				
				//MapInfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + GetMapInfo.lengthsec).slice(-2)
				} else {
					lengthsec = GetMapInfo.lengthsec
				}

				//ModにDTとNCが入っていたときの処理
				if (modforresult.includes("DT") && modforresult.includes("NC")) {
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null)
					modforresult = modsnotDT
				}

				//ODを計算
				let odscaled = ODscaled(GetMapInfo.od, mods);

				//Modがないときの処理(NMを代入する)
				if (modforresult.length == 0) {
					modforresult.push("NM")
				}

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
					.addFields({ name: "`Grade`", value: `**${recentplay.rank}** + ${modforresult.join("")}`, inline: true })
					.addFields({ name: "`Score`", value: recentplay.score, inline: true })
					.addFields({ name: "`Acc`", value: `${acc}%`, inline: true })
					.addFields({ name: "`PP`", value: `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Combo`", value: `${recentplay.maxcombo}x / ${GetMapInfo.combo}x`, inline: true })
					.addFields({ name: "`Hits`", value: `{${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, inline: true })
					.addFields({ name: "`If FC`",  value: `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Acc`",  value: `${ifFCacc}%`, inline: true })
					.addFields({ name: "`Hits`",  value: `{${ifFC300}/${ifFC100}/0}`, inline: true })
					.addFields({ name: "`Map Info`",  value: `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, inline: true })
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter({ text: `${Mapstatus} mapset of ${GetMapInfo.mapper}`, iconURL: mappersdata.iconurl });
					await message.channel.send({ embeds: [embed] }).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
								.addFields({ name: "`Result`", value: `**${recentplay.rank}** + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, inline: true })
								sentMessage.edit({ enbeds: [embednew] })
							}, 20000
						)
					}
				)
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//!rtコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!rt") {
			try {
				//ユーザー名が入力されなかったときの処理、されたときの処理
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					try {
						let username = message.author.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
				} else {
					playername = message.content.split(" ")[1]
					if (playername == undefined) {
						message.reply("メッセージからユーザー名を取得するのに失敗しました。")
						return
					} else if(playername == "") {
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
				}

				//ユーザー名からRecentplayを情報を取得
				const recentplay = await Recentplay(apikey, playername, 1);
				if (recentplay == undefined) {
					message.reply(`${playername}さんには24時間以内にプレイしたTaiko譜面がないようです。`)
					return
				}

				//Recentplayの情報から必要な情報を取得
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);

				//プレイヤーの情報の取得中にエラーが発生した場合の処理
				if (playersdata == undefined) {
					message.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
					return
				}

				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);

				//マッパーの情報の取得中にエラーが発生した場合の処理
				if (mappersdata == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				//Accを計算
				const acc = tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "taiko");
				
				//BPM、Modの処理
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if (mods.includes("NC")) {
					let modsnotNC = mods.filter((item) => item.match("NC") == null)
					mods = modsnotNC
					modsforcalc = parseModString(mods);
					BPM *= 1.5
				} else if (mods.includes("HT")) {
					BPM *= 0.75
				}

				//SR、IfFCの精度(300や100)を計算
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if (recentplay.countmiss == 0) {
					ifFC100 = recentplay.count100
				} else {
					ifFC100 = recentplay.count100 + recentplay.countmiss
				}
				let ifFC300;
				if (recentplay.countmiss == 0) {
					ifFC300 = GetMapInfo.combo - recentplay.count100
				} else {
					ifFC300 = GetMapInfo.combo - recentplay.count100 - recentplay.countmiss
				}

				//IfFCの精度(300や100)からAccを計算
				const ifFCacc = tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: "0", 0: "0", geki: "0", katu: "0"}, "taiko");
				const percentage = ((recentplay.totalhitcount / GetMapInfo.combo) * 100).toFixed(0);

				//Mapstatusを取得(Ranked, Loved, Qualified, Pending, WIP, Graveyard)
				const Mapstatus = mapstatus(GetMapInfo.approved);

				//RecentplayのPP、IfFCのPPを計算
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);

				//MapInfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2);
				} else {
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0);
				}

				//ModにDTとNCが入っていたときの処理
				if (modforresult.includes("DT") && modforresult.includes("NC")) {
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null)
					modforresult = modsnotDT
				}

				//ODを計算
				let odscaled = ODscaled(GetMapInfo.od, mods);

				//Modがないときの処理(NMを代入する)
				if (modforresult.length == 0) {
					modforresult.push("NM")
				}

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
					.addFields({ name: "`Grade`", value: `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, inline: true })
					.addFields({ name: "`Score`", value: recentplay.score, inline: true })
					.addFields({ name: "`Acc`", value: `${acc}%`, inline: true })
					.addFields({ name: "`PP`", value: `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Combo`", value: `${recentplay.maxcombo}x / ${GetMapInfo.combo}x`, inline: true })
					.addFields({ name: "`Hits`", value: `{${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, inline: true })
					.addFields({ name: "`If FC`", value: `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Acc`", value: `${ifFCacc}%`, inline: true })
					.addFields({ name: "`Hits`", value: `{${ifFC300}/${ifFC100}/0}`, inline: true })
					.addFields({ name: "`Map Info`", value: `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, inline: true })
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter({ text: `${Mapstatus} mapset of ${GetMapInfo.mapper}`, iconURL: mappersdata.iconurl });
					await message.channel.send({ embeds: [embed] }).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
								.addFields({ name: "`Result`", value: `**${recentplay.rank}** (**${percentage}%**) + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${parseFloat(recentpp.ppwithacc).toFixed(2)}** / ${iffcpp.SSPP} [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]  {${recentplay.count300}/${recentplay.count100}/${recentplay.countmiss}}`, inline: true })
								sentMessage.edit({ enbeds: [embednew] })
							}, 20000
						)
					}
				)
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//!rcコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!rc") {
			try {
				//ユーザー名が入力されなかったときの処理、されたときの処理
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					try {
						let username = message.author.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
				} else {
					playername = message.content.split(" ")[1]
					if (playername == undefined) {
						message.reply("メッセージからユーザー名を取得するのに失敗しました。")
						return
					} else if (playername == "") {
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
				}

				//ユーザー名からRecentplayを情報を取得
				const recentplay = await Recentplay(apikey, playername, 2);
				if (recentplay == undefined) {
					message.reply(`${playername}さんには24時間以内にプレイしたCatch譜面がないようです。`)
					return
				}

				//Recentplayの情報から必要な情報を取得
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);

				//プレイヤーの情報の取得中にエラーが発生した場合の処理
				if (playersdata == undefined) {
					message.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
					return
				}

				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);

				//マッパーの情報の取得中にエラーが発生した場合の処理
				if (mappersdata == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				const acc = tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "fruits")
				
				//BPM、Modの処理
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if (mods.includes("NC")) {
					let modsnotNC = mods.filter((item) => item.match("NC") == null)
					mods = modsnotNC
					modsforcalc = parseModString(mods)
					BPM *= 1.5
				} else if (mods.includes("HT")) {
					BPM *= 0.75
				}

				//SR、IfFCの精度(300や100)を計算
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode));
				let ifFC100;
				if (recentplay.countmiss == 0) {
					ifFC100 = recentplay.count100
				} else {
					ifFC100 = recentplay.count100 + recentplay.countmiss
				}
				let ifFC50;
				if (recentplay.countkatu == 0) {
					ifFC50 = recentplay.count50
				} else {
					ifFC50 = recentplay.count50 + recentplay.countkatu
				}
				let ifFC300;
				if (recentplay.countmiss == 0) {
					ifFC300 = GetMapInfo.combo - recentplay.count100
				} else {
					ifFC300 = GetMapInfo.combo - recentplay.count100 - recentplay.countmiss
				}

				//IfFCの精度(300や100)からAccを計算
				const ifFCacc = tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: ifFC50.toString(), 0: "0", geki: "0", katu: "0"}, "fruits");
				const percentage = parseFloat(((recentplay.count300 + recentplay.count100 + recentplay.count50 + recentplay.countmiss + recentplay.countkatu + recentplay.countgeki) / GetMapInfo.combo) * 100).toFixed(0);
				
				//Mapstatusを取得(Ranked, Loved, Qualified, Pending, WIP, Graveyard)
				const Mapstatus = mapstatus(GetMapInfo.approved);
				
				//RecentplayのPP、IfFCのPPを計算
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);
				
				//MapInfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2)
				} else {
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0)
				}

				//ModにDTとNCが入っていたときの処理
				if (modforresult.includes("DT") && modforresult.includes("NC")) {
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null)
					modforresult = modsnotDT
				}

				//ODを計算
				let odscaled = ODscaled(GetMapInfo.od, mods);

				//Modがないときの処理(NMを代入する)
				if (modforresult.length == 0) {
					modforresult.push("NM");
				}

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
					.addFields({ name: "`Grade`", value: `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, inline: true })
					.addFields({ name: "`Score`", value: recentplay.score, inline: true })
					.addFields({ name: "`Acc`", value: `${acc}%`, inline: true })
					.addFields({ name: "`PP`", value: `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Combo`", value: `${recentplay.maxcombo}x / ${GetMapInfo.combo}x`, inline: true })
					.addFields({ name: "`Hits`", value: `{${recentplay.count300}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, inline: true })
					.addFields({ name: "`If FC`", value: `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Acc`", value: `${ifFCacc}%`, inline: true })
					.addFields({ name: "`Hits`", value: `{${ifFC300}/${ifFC100}/${ifFC50}/0}`, inline: true })
					.addFields({ name: "`Map Info`", value: `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, inline: true })
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter({ text: `${Mapstatus} mapset of ${GetMapInfo.mapper}`, iconURL: mappersdata.iconurl });
					await message.channel.send({ embeds: [embed] }).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
								.addFields({ name: "`Result`", value: `**${recentplay.rank}** (**${percentage}%**) + **${modforresult.join("")}**   **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recentplay.count300}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, inline: true })
								sentMessage.edit({ enbeds: [embednew] })
							}, 20000
						)
					}
				)
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//!rmコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!rm") {
			try {
				//ユーザー名が入力されなかったときの処理、されたときの処理
				let playername;
				if (message.content.split(" ")[1] == undefined) {
					try {
						let username = message.author.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
				} else {
					playername = message.content.split(" ")[1]
					if (playername == undefined) {
						message.reply("メッセージからユーザー名を取得するのに失敗しました。")
						return
					} else if (playername == ""){
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
				}

				//ユーザー名からRecentplayを情報を取得
				const recentplay = await Recentplay(apikey, playername, 3);
				if (recentplay == undefined) {
					message.reply(`${playername}さんには24時間以内にプレイしたMania譜面がないようです。`)
					return
				}

				//Recentplayの情報から必要な情報を取得
				let mods = parseMods(recentplay.enabled_mods);
				let modforresult = parseMods(recentplay.enabled_mods);
				const GetMapInfo = await getMapforRecent(recentplay.beatmap_id, apikey, mods);
				const playersdata = await getplayersdata(apikey, playername, GetMapInfo.mode);

				//プレイヤーの情報の取得中にエラーが発生した場合の処理
				if (playersdata == undefined) {
					message.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
					return
				}

				const mappersdata = await getplayersdata(apikey, GetMapInfo.mapper);

				//マッパーの情報の取得中にエラーが発生した場合の処理
				if (mappersdata == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				const acc = tools.accuracy({300: recentplay.count300.toString(), 100: recentplay.count100.toString(), 50: recentplay.count50.toString(), 0: recentplay.countmiss.toString(), geki: recentplay.countgeki.toString(), katu: recentplay.countkatu.toString()}, "mania")
				
				//BPM、Modの処理
				let BPM = GetMapInfo.bpm;
				let modsforcalc = parseModString(mods);
				if (mods.includes("NC")) {
					let modsnotNC = mods.filter((item) => item.match("NC") == null)
					mods = modsnotNC
					modsforcalc = parseModString(mods)
					BPM *= 1.5
				} else if (mods.includes("HT")) {
					BPM *= 0.75
				}

				//SR、IfFCの精度(300や100)を計算
				let sr = await calculateSR(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode))
				let ifFC100;
				if (recentplay.countmiss == 0) {
					ifFC100 = recentplay.count100
				} else {
					ifFC100 = recentplay.count100 + recentplay.countmiss
				}
				let ifFC50 = recentplay.count50;
				let ifFC200;
				if (recentplay.countmiss == 0) {
					ifFC200 = recentplay.countkatu
				} else {
					ifFC200 = recentplay.countkatu + recentplay.countmiss
				}
				let ifFC300;
				if (recentplay.countmiss == 0) {
					ifFC300 = GetMapInfo.combo - recentplay.countkatu - recentplay.count100 - recentplay.count50
				} else {
					ifFC300 = GetMapInfo.combo - recentplay.countkatu - recentplay.count100 - recentplay.count50 - recentplay.countmiss
				}

				//IfFCの精度(300や100)からAccを計算
				const ifFCacc = tools.accuracy({300: ifFC300.toString(), 100: ifFC100.toString(), 50: ifFC50.toString(), 0: "0", geki: "0", katu: ifFC200.toString()}, "mania");
				const percentage = parseFloat(((recentplay.count300 + recentplay.count100 + recentplay.count50 + recentplay.countmiss + recentplay.countkatu + recentplay.countgeki) / GetMapInfo.combo) * 100).toFixed(0);
				
				//Mapstatusを取得(Ranked, Loved, Qualified, Pending, WIP, Graveyard)
				const Mapstatus = mapstatus(GetMapInfo.approved);
				
				//RecentplayのPP、IfFCのPPを計算
				const recentpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), acc, recentplay.countmiss, recentplay.maxcombo);
				const iffcpp = await calculateSRwithacc(recentplay.beatmap_id, modsforcalc, modeconvert(GetMapInfo.mode), ifFCacc, 0, GetMapInfo.combo);
				
				//MapInfo.lengthsecを分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec
				if (numDigits(parseFloat(GetMapInfo.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + parseFloat(GetMapInfo.lengthsec).toFixed(0)).slice(-2)
				} else {
					lengthsec = parseFloat(GetMapInfo.lengthsec).toFixed(0)
				}

				//ModにDTとNCが入っていたときの処理
				if (modforresult.includes("DT") && modforresult.includes("NC")) {
					let modsnotDT = modforresult.filter((item) => item.match("DT") == null)
					modforresult = modsnotDT
				}

				//ODを計算
				let odscaled = ODscaled(GetMapInfo.od, mods);

				//Modがないときの処理(NMを代入する)
				if (modforresult.length == 0) {
					modforresult.push("NM")
				}

				//マニア専用でrecent300を計算する。recent300は300とgekiを合わせたもの(V2以外)
				let recent300 = recentplay.count300 + recentplay.countgeki;

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}]`)
					.setURL(GetMapInfo.maplink)
					.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
					.addFields({ name: "`Grade`", value: `**${recentplay.rank}** (${percentage}%) + ${modforresult.join("")}`, inline: true })
					.addFields({ name: "`Score`", value: recentplay.score, inline: true })
					.addFields({ name: "`Acc`", value: `${acc}%`, inline: true })
					.addFields({ name: "`PP`", value: `**${recentpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Combo`", value: `${recentplay.maxcombo}x / ${GetMapInfo.combo}x`,inline: true })
					.addFields({ name: "`Hits`", value: `{${recent300}/${recentplay.countkatu}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, inline: true })
					.addFields({ name: "`If FC`", value: `**${iffcpp.ppwithacc}** / ${iffcpp.SSPP}PP`, inline: true })
					.addFields({ name: "`Acc`", value: `${ifFCacc}%`, inline: true })
					.addFields({ name: "`Hits`", value: `{${ifFC300}/${ifFC100}/${ifFC50}/0}`, inline: true })
					.addFields({ name: "`Map Info`", value: `Length:\`${GetMapInfo.lengthmin}:${lengthsec}\` BPM:\`${BPM}\` Objects:\`${GetMapInfo.combo}\` \n  CS:\`${GetMapInfo.cs}\` AR:\`${GetMapInfo.ar}\` OD:\`${odscaled.toFixed(1)}\` HP:\`${GetMapInfo.hp}\` Stars:\`${sr.sr}\``, inline: true })
					.setImage(`https://assets.ppy.sh/beatmaps/${GetMapInfo.beatmapset_id}/covers/cover.jpg`)
					.setTimestamp()
					.setFooter({ text: `${Mapstatus} mapset of ${GetMapInfo.mapper}`, iconURL: mappersdata.iconurl });
					await message.channel.send({ embeds: [embed] }).then((sentMessage) => {
						setTimeout(() =>
							{
								const embednew = new EmbedBuilder()
								.setColor("Blue")
								.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} [${GetMapInfo.version}] [${sr.sr}★]`)
								.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
								.setURL(GetMapInfo.maplink)
								.setAuthor({ name: `${playersdata.username}: ${playersdata.pp_raw}pp (#${playersdata.pp_rank} ${playersdata.country}${playersdata.pp_country_rank})`, iconURL: playersdata.iconurl, url: playersdata.playerurl })
								.addFields({ name: "`Result`", value: `**${recentplay.rank}** (**${percentage}%**) + **${modforresult}**  **Score**:**${recentplay.score}** (**ACC**:**${acc}%**) \n  **PP**:**${recentpp.ppwithacc}** / ${iffcpp.SSPP}   [**${recentplay.maxcombo}**x / ${GetMapInfo.combo}x]   {${recent300}/${recentplay.countkatu}/${recentplay.count100}/${recentplay.count50}/${recentplay.countmiss}}`, inline: true })
								sentMessage.edit({ enbeds: [embednew] })
							}, 20000
						)
					}
				)
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//!r◯のコマンド説明(osu!BOT)
		if (message.content == "!r") {
			message.reply("使い方: !r(o, t, c, m) <osu!ユーザーネーム(省略可)>")
			return
		}

		//!regコマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!reg") {
			//ユーザー名が入力されなかったときの処理、されたときの処理
			if (message.content == "!reg") {
				message.reply("使い方: !reg <osu!ユーザーネーム>")
				return
			}

			const username = message.author.id
			const osuid = message.content.split(" ")[1]

			//ユーザー名が入力されなかったときの処理
			if (osuid == undefined) {
				message.reply("ユーザー名を入力してください。")
				return
			}

			//ユーザー名の前に空白1つ多く入っていた時の処理
			if (osuid == "") {
				message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
				return
			}

			try {
				fs.writeFileSync(`./Player infomation/${username}.txt`, osuid, "utf-8")
				message.reply(`${message.author.username} さんは ${osuid} として保存されました!`)
			} catch (e) {
				console.log(e)
				message.reply("ユーザーを登録する際にエラーが発生しました。")
				return
			}
		}

		//ユーザーの最高記録を表示するコマンド(osu!BOT)
		if (message.content.split(" ")[0] == "!s") {
			try {
				//!sのみ入力された場合の処理
				if (message.content == "!s") {
					message.reply("使い方: !s <マップリンク> <osu!ユーザーネーム(省略可)>")
					return
				}

				//プレイヤー名が入力された時、されてない時の処理
				let playername;
				if (message.content.split(" ")[2] == undefined) {
					try {
						let username = message.author.id
						let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
						playername = osuid
					} catch (e) {
						console.log(e)
						message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
						return
					}
				} else {
					playername = message.content.split(" ")[2]
					if (playername == undefined) {
						message.reply("メッセージからユーザー名を取得できませんでした。")
						return
					}
					if (playername == "") {
						message.reply("ユーザー名の前の空白が1つ多い可能性があります。")
						return
					}
				}

				//メッセージからマップリンクを取得
				const maplink = message.content.split(" ")[1];
				const beatmapId = message.content.split("#")[1].split("/")[1].split(" ")[0];

				//マップリンクが入力されてなかったときの処理
				if (maplink == undefined) {
					message.reply("マップリンクを入力してください。")
					return
				}

				//マップリンクの前に空白が1つより多かったときの処理
				if (maplink == "") {
					message.reply("マップリンクの前の空白が1つ多い可能性があります。")
					return
				}

				if (!maplink.startsWith("https://osu.ppy.sh/beatmapsets/")) {
					message.reply("マップリンクの形式が間違っています。")
					return
				}

				//マップ情報、スコア情報を取得
				const Mapinfo = await getMapInfowithoutmods(maplink, apikey);
				const playersscore = await getplayerscore(apikey, beatmapId, playername, Mapinfo.mode);

				//スコア情報がなかった時の処理
				if (playersscore == undefined) {
					message.reply(`${playername}さんのスコアが見つかりませんでした。`)
					return
				}

				//マップ情報、プレイヤー情報、マッパー情報を取得
				const Playersinfo = await getplayersdata(apikey, playername, GetMapInfo.mode);

				//プレイヤーの情報の取得中にエラーが発生した場合の処理
				if (Playersinfo == undefined) {
					message.reply("プレイヤーの情報の取得中にエラーが発生しました。このプレイヤーは存在しない可能性があります。")
					return
				}

				const Mapperinfo = await getplayersdata(apikey, GetMapInfo.mapper);

				//マッパーの情報の取得中にエラーが発生した場合の処理
				if (Mapperinfo == undefined) {
					message.reply("マッパーの情報の取得中にエラーが発生しました。このマッパーは存在しない可能性があります。")
					return
				}

				//Accを計算
				const acc = tools.accuracy({300: playersscore.count300.toString(), 100: playersscore.count100.toString(), 50: playersscore.count50.toString(), 0: playersscore.countmiss.toString(), geki : playersscore.countgeki.toString(), katu: playersscore.countgeki.toString()}, modeconvert(Mapinfo.mode));
				
				//Modsを取得
				let stringmods = parseMods(playersscore.enabled_mods);

				//ModsにNCが入っていたときにDTに置き換える処理
				if (stringmods.includes("DT") && stringmods.includes("NC")) {
					let modsnotNC = stringmods.filter((item) => item.match("NC") == null)
					stringmods = modsnotNC
				}

				//SS時のPPを取得
				const srpp = await calculateSRwithacc(beatmapId, parseModString(stringmods), modeconvert(Mapinfo.mode), acc, playersscore.countmiss, playersscore.maxcombo);
				
				//Hits欄をmodeによって変更する処理
				let Hits;
				if (Mapinfo.mode == 0 || Mapinfo.mode == 1) {
					Hits = `{${playersscore.count300}/${playersscore.count100}/${playersscore.countmiss}}`
				} else if (Mapinfo.mode == 2) {
					Hits = `{${playersscore.count300}/${playersscore.count100}/${playersscore.count50}/${playersscore.countmiss}}`
				} else if (Mapinfo.mode == 3) {
					let maniascore300 = parseInt(playersscore.count300) + parseInt(playersscore.countgeki)
					Hits `{${maniascore300}/${playersscore.countkatu}/${playersscore.count100}/${playersscore.count50}/${playersscore.countmiss}}`
				}

				//表示専用のMod欄を作成
				let showonlymods = parseMods(playersscore.enabled_mods);
				if (showonlymods.includes("DT") && showonlymods.includes("NC")) {
					let modsnotDT = showonlymods.filter((item) => item.match("DT") == null)
					showonlymods = modsnotDT
				} else if (showonlymods.length == 0) {
					showonlymods.push("NM")
				}
				let bpm = Mapinfo.bpm;

				//BPMの処理
				if (stringmods.includes("DT") || stringmods.includes("NC")) {
					bpm *= 1.5
				} else if (stringmods.includes("HT")) {
					bpm *= 0.75
				}

				//メッセージ送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`${Mapinfo.artist} - ${Mapinfo.title} [${Mapinfo.version}]`)
					.setURL(maplink)
					.setAuthor({ name: `Mapped by ${Mapinfo.mapper}`,  iconURL: Mapperinfo.iconurl, url: `https://osu.ppy.sh/users/${Mapperinfo.user_id}` })
					.addFields({ name: "Player name", value: `[${playername}](https://osu.ppy.sh/users/${playername})`, inline: true })
					.addFields({ name: "SR", value: `\`★${srpp.sr}\``, inline: true })
					.addFields({ name: "BPM", value: `\`${bpm}\``, inline: true })
					.addFields({ name: "Rank", value: `\`${playersscore.rank}\``, inline: true })
					.addFields({ name: "Hits", value: Hits, inline: true })
					.addFields({ name: "Mods", value: `\`${showonlymods.join("")}\``, inline: true })
					.addFields({ name: "Accuracy", value: `\`${acc}%\``, inline: true })
					.addFields({ name: "PP", value: `**${srpp.ppwithacc}** / ${srpp.SSPP} `, inline: true })
					.addFields({ name: "Mirror Download link", value: `[Nerinyan](https://api.nerinyan.moe/d/${Mapinfo.beatmapset_id}?nv=1) \n [Beatconnect](https://beatconnect.io/b/${Mapinfo.beatmapset_id})`, inline: true })
					.setImage(`https://assets.ppy.sh/beatmaps/${Mapinfo.beatmapset_id}/covers/cover.jpg`)
					.setFooter({ text: `Played by ${playername}  #${Playersinfo.pp_rank} (${Playersinfo.country}${Playersinfo.pp_country_rank})`, iconURL: Playersinfo.iconurl });
					message.channel.send({ embeds: [embed] })
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}
		
		//Beatmapリンクが入力されたときの処理(osu!BOT)
		if (message.content.startsWith("https://osu.ppy.sh/beatmapsets/")) {
			try {
				//チャンネルidを取得
				const channelid = message.channel.id;

				//全ての登録済みのチャンネルを取得、チャンネルidがにChannels.txtになかった場合の処理
				const allchannels = fs.readFileSync("./BeatmapLinkChannels/Channels.txt", "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
				if (!allchannels.includes(channelid)) return;

				//マップ情報を取得
				const mapdata = await getMapInfowithoutmods(message.content, apikey);

				//マッパー情報を取得
				const mapperdata = await getplayersdata(apikey, mapdata.mapper);

				//SRを計算
				const sr = await calculateSR(mapdata.beatmapId, 0, modeconvert(mapdata.mode));

				//マップの時間の秒数を分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(mapdata.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + mapdata.lengthsec.toString()).slice(-2)
				} else {
					lengthsec = parseFloat(mapdata.lengthsec.toString()).toFixed(0)
				}

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setAuthor({ text: `${mapdata.artist} - ${mapdata.title} by ${mapdata.mapper}`, iconURL: mapperdata.iconurl, url: message.content })
					.setDescription(`**Length**: ${mapdata.lengthmin}:${lengthsec} **BPM**: ${mapdata.bpm} **Mods**: -\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapdata.beatmapset_id}) | [osu!direct](https://osu.ppy.sh/d/${mapdata.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapdata.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapdata.beatmapset_id})`)
					.addFields({ name: `**[__${mapdata.version}__]**`, value: `▸**Difficulty:**  ${sr.sr}★ ▸**Max Combo:** ${mapdata.combo}x\n▸**OD:** ${mapdata.od} ▸**CS:** ${mapdata.cs} ▸**AR:** ${mapdata.ar} ▸**HP:** ${mapdata.hp}\n▸**PP:** ○ **95**%-${sr.S5} ○ **99**%-${sr.S2} ○ **100**%-${sr.S0}`, inline: false })
					.setTimestamp()
					.setImage(`https://assets.ppy.sh/beatmaps/${mapdata.beatmapset_id}/covers/cover.jpg`)
					.setFooter({ text: `${mapstatus(mapdata.approved)} mapset of ${mapdata.mapper}` });
				message.channel.send({ embeds: [embed] })
			} catch (e) {
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				console.log(e)
				return
			}
		}

		//!m <Mods>コマンドの処理(osu!BOT)
		if (message.content.split(" ")[0] == "!m") {
			try {
				//!mのみ入力された時の処理
				if (message.content == "!m") {
					message.reply("使い方: !m <Mods>")
					return
				}

				//チャンネルidを取得
				const channelid = message.channel.id;

				//全ての登録済みのチャンネルを取得、チャンネルidがChannels.txtになかった場合の処理
				const allchannels = fs.readFileSync("./BeatmapLinkChannels/Channels.txt", "utf-8").split(" ").filter((function(channel) {return channel !== "";}));
				if (!allchannels.includes(channelid)) return;

				//チャンネルから直近の50件のメッセージを取得する
				const messagedata = await message.channel.messages.fetch();
				const maplinks = messagedata.filter(function(message) {return message.content.startsWith("https://osu.ppy.sh/beatmapsets/")}).array();
				if (maplinks[0] == undefined) {
					message.reply("直近50件のメッセージからマップリンクが見つかりませんでした。")
					return
				}
				const recentmaplink = maplinks[0].toString();

				//Modsが入力されてなかったときの処理
				if (message.content.split(" ")[1] == undefined) {
					message.reply("Modsを入力してください。")
					return
				}
				
				//Modsの前に空白が1つより多かったときの処理
				if (message.content.split(" ")[1] == "") {
					message.reply("Modsの前の空白が1つ多い可能性があります。")
					return
				}

				//Modsの処理
				let Mods = [];
				Mods = [message.content.split(" ")[1].toUpperCase()];
				Mods = splitString(Mods);
				if (!checkStrings(Mods)) {
					message.reply("入力されたModは存在しないか、指定できないModです。存在するMod、AutoなどのMod以外を指定するようにしてください。")
					return
				}
				if((Mods.includes("NC") && Mods.includes("HT")) || (Mods.includes("DT") && Mods.includes("HT") || (Mods.includes("DT") && Mods.includes("NC")) || (Mods.includes("EZ") && Mods.includes("HR")))) {
					message.reply("同時に指定できないModの組み合わせがあるようです。ちゃんとしたModの組み合わせを指定するようにしてください。");
					return
				}
				if (Mods.includes("NC")) {
					Mods.push("DT")
					let modsnotNC = Mods.filter((item) => /NC/.exec(item) == null)
					Mods = modsnotNC
				}

				//マップ情報を取得
				const mapdata = await getMapInfo(recentmaplink, apikey, Mods);

				//マッパー情報を取得
				const mapperdata = await getplayersdata(apikey, mapdata.mapper);

				//SRを計算
				const sr = await calculateSR(mapdata.beatmapId, parseModString(Mods), modeconvert(mapdata.mode));

				//マップの時間の秒数を分と秒に分ける処理、秒の桁数によって処理を変える(1秒 => 01秒、9秒 => 09秒)
				let lengthsec;
				if (numDigits(parseFloat(mapdata.lengthsec.toFixed(0))) == 1) {
					lengthsec = ('00' + mapdata.lengthsec.toString()).slice(-2)
				} else {
					lengthsec = parseFloat(mapdata.lengthsec.toString()).toFixed(0)
				}

				//表示用のMod欄を作成
				const showonlymods = message.content.split(" ")[1].toUpperCase();

				//メッセージを送信
				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setAuthor({ name: `${mapdata.artist} - ${mapdata.title} by ${mapdata.mapper}`, iconURL: mapperdata.iconurl, url: recentmaplink })
					.setDescription(`**Length**: ${mapdata.lengthmin}:${lengthsec} **BPM**: ${mapdata.bpm} **Mods**: ${showonlymods}\n**Download**: [map](https://osu.ppy.sh/beatmapsets/${mapdata.beatmapset_id}) | [osu!direct](https://osu.ppy.sh/d/${mapdata.beatmapset_id}) | [Nerinyan](https://api.nerinyan.moe/d/${mapdata.beatmapset_id}?nv=1) | [Beatconnect](https://beatconnect.io/b/${mapdata.beatmapset_id})`)
					.addFields({ name: `**[__${mapdata.version}__]**`, value: `▸**Difficulty:**  ${sr.sr}★ ▸**Max Combo:** ${mapdata.combo}x\n▸**OD:** ${mapdata.od} ▸**CS:** ${mapdata.cs} ▸**AR:** ${mapdata.ar} ▸**HP:** ${mapdata.hp}\n▸**PP:** ○ **95**%-${sr.S5} ○ **99**%-${sr.S2} ○ **100**%-${sr.S0}`, inline: false })
					.setTimestamp()
					.setImage(`https://assets.ppy.sh/beatmaps/${mapdata.beatmapset_id}/covers/cover.jpg`)
					.setFooter({ text: `${mapstatus(mapdata.approved)} mapset of ${mapdata.mapper}` });
				message.channel.send({ embeds: [embed] })
			} catch(e) {
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				console.log(e)
				return
			}
		}

		//!wi + o,t,c,mコマンドの処理
		if (message.content.startsWith("!wi")) {
			try {
				//!wiのみ入力された時の処理
				if (message.content == "!wi") {
					message.reply("使い方: !wi◯<モード(o, t, c, m)>")
					return
				}

				//ユーザーネームを取得
				let playername;
				try {
					let username = message.author.id
					let osuid = fs.readFileSync(`./Player infomation/${username}.txt`, "utf-8")
					playername = osuid
				} catch (e) {
					console.log(e)
					message.reply("ユーザーが登録されていません。!regコマンドで登録してください。")
					return
				}

				//ppが入力されなかったときの処理、されたときの処理
				let enteredpp = "";
				if (message.content.split(" ")[1] == undefined) {
					message.reply("ppを入力してください。")
					return
				}

				//ppの前の空白が1つ多かった時の処理
				if (message.content.split(" ")[1] == "") {
					message.reply("ppの前の空白が1つ多い可能性があります。")
					return
				}

				//ppが数字と"."だけで構成されているか確認
				enteredpp = message.content.split(" ")[1];
				if (!RegExp(/^\d+$/).exec(enteredpp)) {
					message.reply("ppは数字のみで構成されている必要があります。")
					return
				}

				//モードが入力されなかったときの処理、されたときの処理
				let mode = "";
				let modeforranking = "";
				if (message.content.startsWith("!wio")) {
					mode = "0"
					modeforranking = "osu"
				} else if (message.content.startsWith("!wit")) {
					mode = "1"
					modeforranking = "taiko"
				} else if (message.content.startsWith("!wic")) {
					mode = "2"
					modeforranking = "fruits"
				} else if (message.content.startsWith("!wim")) {
					mode = "3"
					modeforranking = "mania"
				} else {
					message.reply("モードの指定方法が間違っています。ちゃんと存在するモードを選択してください。")
					return
				}

				//ユーザー情報、PPなどを取得
				const response = await axios.get(
					`https://osu.ppy.sh/api/get_user_best?k=${apikey}&type=string&m=${mode}&u=${playername}&limit=100`
				);
				const userplays = response.data;
				let pp = [];
				for (const element of userplays) {
					pp.push(element.pp)
				}
				let oldpp = [];
				for (const element of userplays) {
					oldpp.push(element.pp)
				}
				pp.push(enteredpp)
				pp.sort((a, b) => b - a)

				//PPが変動しないときの処理(101個目のものと同じ場合)
				if (enteredpp == pp[pp.length - 1]) {
					message.reply("PPに変動は有りません。")
					return
				} else {
					pp.pop()
				}

				//BPtop何位かを取得するための配列を作成
				const forbpranking = [];
				for (const element of userplays) {
					forbpranking.push(element.pp)
				}
				forbpranking.push(enteredpp)
				forbpranking.sort((a, b) => b - a)

				//GlobalPPやBonusPPなどを計算する
				const userdata = await getplayersdata(apikey, playername, mode);
				const playcount = userdata.count_rank_ss + userdata.count_rank_ssh + userdata.count_rank_s + userdata.count_rank_sh + userdata.count_rank_a;
				const oldglobalPPwithoutBonusPP = calculateScorePP(oldpp, playcount);
				const globalPPwithoutBonusPP = calculateScorePP(pp, playcount + 1);
				const bonusPP = userdata.pp_raw - oldglobalPPwithoutBonusPP + ((416.6667 * (1 - (0.9994 ** (playcount + 1)))) - (416.6667 * (1 - (0.9994 ** playcount))));
				const globalPP = globalPPwithoutBonusPP + bonusPP;

				//ランキングを取得
				let ranking = 0;
				await auth.login(osuclientid, osuclientsecret);
				let foundflag = false;
				for (let page = 0; page <= 120; page++) {
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
					
					if (globalPP > rankingdata.ranking[rankingdata.ranking.length - 1].pp) break;
				}

				if(!foundflag) {
					const notfoundembed = new EmbedBuilder()
						.setColor("Blue")
						.setTitle(`What if ${playername} got a new ${enteredpp}pp score?`)
						.setDescription(`A ${enteredpp}pp play would be ${playername}'s #${forbpranking.indexOf(enteredpp) + 1} best play.\nTheir pp would change by **+${parseFloat((globalPP - userdata.pp_raw).toFixed(2)).toLocaleString()}** to **${parseFloat(globalPP.toFixed(2)).toLocaleString()}pp** and they would reach approx. rank <#6000(Calculations are not available after page 120.).`)
						.setThumbnail(userdata.iconurl)
						.setAuthor({ name: `${userdata.username}: ${userdata.pp_raw.toLocaleString()}pp (#${userdata.pp_rank.toLocaleString()} ${userdata.country}${userdata.pp_country_rank.toLocaleString()})`, iconURL: userdata.iconurl, url: userdata.playerurl })
					message.channel.send({ embeds: [notfoundembed] })
					return
				}

				const embed = new EmbedBuilder()
					.setColor("Blue")
					.setTitle(`What if ${playername} got a new ${enteredpp}pp score?`)
					.setDescription(`A ${enteredpp}pp play would be ${playername}'s #${forbpranking.indexOf(enteredpp) + 1} best play.\nTheir pp would change by **+${parseFloat((globalPP - userdata.pp_raw).toFixed(2)).toLocaleString()}** to **${parseFloat(globalPP.toFixed(2)).toLocaleString()}pp** and they would reach approx. rank #${ranking.toLocaleString()} (+${(userdata.pp_rank - ranking).toLocaleString()}).`)
					.setThumbnail(userdata.iconurl)
					.setAuthor({ name: `${userdata.username}: ${userdata.pp_raw.toLocaleString()}pp (#${userdata.pp_rank.toLocaleString()} ${userdata.country}${userdata.pp_country_rank.toLocaleString()})`, iconURL: userdata.iconurl, url: userdata.playerurl })
				message.channel.send({ embeds: [embed] })
			} catch (e) {
				console.log(e)
				message.reply("コマンド処理中になんらかのエラーが発生しました。osu!のサーバーエラーか、サーバーのネットワークの問題かと思われます。")
				return
			}
		}

		//クイズの答えの取得(osu!BOT)
		if (fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`) && message.content.endsWith("?")) {
			try {
				//Botの発言には反応しないようにする
				if (message.author.bot) return;

				//答えを取得
				const answer = message.content.replace("?", "").toLowerCase().replace(/ /g, "");

				//クイズの問題を取得
				const rawjson = fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8")
				const parsedjson = JSON.parse(rawjson)
				let currenttitle = "";
				let isperfect;
				let foundflagforjson = false;

				//クイズの問題の中から未回答のものを探す
				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true
						currenttitle = element.name
						isperfect = element.Perfect
					}
				}

				//現在の答えを取得
				const currentanswer = currenttitle.toLowerCase().replace(/ /g, "");

				//判定
				if (answer == currentanswer) {
					message.reply("正解です！")
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true
							element.quizstatus = true
							element.Answerer = `:o::clap:${message.author.username}`
							const updatedJsonData = JSON.stringify(parsedjson, null, 2);
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のBGを表示します。`)
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								message.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
								return
							} else {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のプレビューを再生します。`)
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] })
								return
							}
						}
					}

					//次の問題がない場合、クイズを終了する
					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
						let answererstring = ""
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
							}
						}
						message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
						return
					}

					return
				} else if (matchPercentage(answer, currentanswer) > 80 && !isperfect) {
					message.reply(`ほぼ正解です！答え: ${currenttitle}`)
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true
							element.quizstatus = true
							element.Answerer = `:o:${message.author.username}`
							const updatedJsonData = JSON.stringify(parsedjson, null, 2);
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のBGを表示します。`)
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								message.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
								return
							} else {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のプレビューを再生します。`)
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] })
								return
							}
						}
					}

					//次の問題がない場合、クイズを終了する
					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
						let answererstring = ""
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
							}
						}
						message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
						return
					}

					return
				} else if (matchPercentage(answer, currentanswer) > 50 && !isperfect) {
					message.reply(`半分正解です！ 答え: ${currenttitle}`)
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true
							element.quizstatus = true
							element.Answerer = `:o:${message.author.username}`
							const updatedJsonData = JSON.stringify(parsedjson, null, 2);
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"));
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のBGを表示します。`)
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								message.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
								return
							} else {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のプレビューを再生します。`)
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] })
								return
							}
						}
					}

					//次の問題がない場合、クイズを終了する
					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
						let answererstring = ""
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
							}
						}
						message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
						return
					}

					return
				} else if (matchPercentage(answer, currentanswer) > 20 && !isperfect) {
					message.reply(`惜しかったです！ 答え: ${currenttitle}`)
					let foundflagforans = false;
					for (let element of parsedjson) {
						if (!element.quizstatus && !foundflagforans) {
							foundflagforans = true
							element.quizstatus = true
							element.Answerer = `:o:${message.author.username}`
							const updatedJsonData = JSON.stringify(parsedjson, null, 2);
							fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
						}
					}
					const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
					let foundflagforafterjsonanswer = false;
					for (const element of afterjson) {
						if (!element.quizstatus && !foundflagforafterjsonanswer) {
							if (element.mode == "BG") {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のBGを表示します。`)
								const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
								const BGdata = response.data;
								message.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
								return
							} else {
								foundflagforafterjsonanswer = true
								message.channel.send(`問題${element.number}のプレビューを再生します。`)
								const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
								const audioData = response.data;
								message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] })
								return
							}
						}
					}

					//次の問題がない場合、クイズを終了する
					if (!foundflagforafterjsonanswer) {
						const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
						let answererstring = ""
						for (let i = 0; i < answererarray.length; i++) {
							if (answererarray[i].Answerer == "") continue;
							if (answererarray[i].hint) {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}** ※ヒント使用\n`
							} else {
								answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
							}
						}
						message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
						fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
						return
					}

					return
				} else {
					message.reply(`不正解です;-; 答えの約${Math.round(matchPercentage(answer, currentanswer))}%を入力しています。`)
					return
				}
			} catch (e) {
				console.log(e)
				message.reply("コマンドの処理中になんらかのエラーが発生しました。")
				return
			}
		}

		//!skipコマンドの処理(osu!BOT)
		if (message.content == "!skip") {
			try {
				//クイズが開始されているかをファイルの存在から確認する
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					message.reply("クイズが開始されていません。")
					return
				}

				//クイズの問題を取得
				const rawjson = fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8")
				const parsedjson = JSON.parse(rawjson)
				let currenttitle = "";
				let foundflagforjson = false;
				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						currenttitle = element.name
					}
				}

				//現在の答えを取得
				message.reply(`答え: ${currenttitle}`)

				//quizstatusをtrueにする
				let foundflagforans = false;
				for (let element of parsedjson) {
					if (!element.quizstatus && !foundflagforans) {
						foundflagforans = true
						element.quizstatus = true
						element.Answerer = `:x:${message.author.username}さんによってスキップされました。`
						const updatedJsonData = JSON.stringify(parsedjson, null, 2);
						fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
					}
				}

				//次の問題に移る
				const afterjson = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
				let foundflagforafterjsonanswer = false;
				for (const element of afterjson) {
					if (!element.quizstatus && !foundflagforafterjsonanswer) {
						if (element.mode == "BG") {
							foundflagforafterjsonanswer = true
							message.channel.send(`問題${element.number}のBGを表示します。`)
							const response = await axios.get(`https://assets.ppy.sh/beatmaps/${element.id}/covers/raw.jpg`, { responseType: 'arraybuffer' });
							const BGdata = response.data;
							message.channel.send({ files: [{ attachment: BGdata, name: 'audio.jpg' }] });
							return
						} else {
							foundflagforafterjsonanswer = true
							message.channel.send(`問題${element.number}のプレビューを再生します。`)
							const response = await axios.get(`https://b.ppy.sh/preview/${element.id}.mp3`, { responseType: 'arraybuffer' });
							const audioData = response.data;
							message.channel.send({ files: [{ attachment: audioData, name: 'audio.mp3' }] })
							return
						}
					}
				}

				//次の問題がない場合、クイズを終了する
				if (!foundflagforafterjsonanswer) {
					const answererarray = JSON.parse(fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8"))
					let answererstring = ""
					for (let i = 0; i < answererarray.length; i++) {
						if (answererarray[i].Answerer == "") continue;
						answererstring += `問題${i + 1}の回答者: **${answererarray[i].Answerer}**\n`
					}
					message.channel.send(`クイズが終了しました！お疲れ様でした！\n${answererstring}`)
					fs.removeSync(`./OsuPreviewquiz/${message.channel.id}.json`)
					return
				}

				return
			} catch (e) {
				console.log(e)
				message.reply("コマンドの処理中になんらかのエラーが発生しました。")
				return
			}
		}

		//!hintコマンドの処理(osu!BOT)
		if (message.content == "!hint") {
			try {
				//クイズが開始されているかをファイルの存在から確認する
				if (!fs.existsSync(`./OsuPreviewquiz/${message.channel.id}.json`)) {
					message.reply("クイズが開始されていません。")
					return
				}

				//クイズの問題を取得
				const rawjson = fs.readFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, "utf-8")
				const parsedjson = JSON.parse(rawjson)
				let currenttitle = "";
				let foundflagforjson = false;
				for (const element of parsedjson) {
					if (!element.quizstatus && !foundflagforjson) {
						foundflagforjson = true;
						if (element.hint) {
							message.reply("ヒントは１問につき１回まで使用できます。")
							return
						}
						currenttitle = element.name
						element.hint = true
						const updatedJsonData = JSON.stringify(parsedjson, null, 2);
						fs.writeFileSync(`./OsuPreviewquiz/${message.channel.id}.json`, updatedJsonData, 'utf8')
					}
				}

				const hidecount = Math.round(currenttitle.replace(" ", "").length / 3)

				//currenttitle.lengthからランダムな数字を取得
				let randomarray = [];
				while (randomarray.length < hidecount) {
					const randomnumber = Math.floor(Math.random() * currenttitle.length)
					if (!randomarray.includes(randomnumber) && currenttitle[randomnumber] != " ") {
							randomarray.push(randomnumber)
					}
				}

				//randomarray文字目だけ表示して、ほかは伏せ字になるようにする
				let hint = "";
				for (let i = 0; i < currenttitle.length; i++) {
					if (currenttitle[i] == " "){
						hint += " "
						continue
					}
					if (randomarray.includes(i)) {
						hint += currenttitle[i]
					} else {
						hint += "◯"
					}
				}

				//ヒントを送信
				message.reply(`ヒント: ${hint}(計${hidecount}文字表示されています。タイトルは${currenttitle.replace(" ", "").length}文字です。)`)
			} catch (e) {
				console.log(e)
				message.reply("コマンドの処理中になんらかのエラーが発生しました。")
				return
			}
		}

		//計算機
		if (RegExp(/^\d+([-+*/^])\d+$/).exec(message.content)) {
			let left;
			let right;
			if (message.content.includes("+")) {
				left = message.content.split("+")[0]
				right = message.content.split("+")[1]
				if (isNaN(left) || isNaN(right)) return;
				message.reply(`${left} + ${right} = ${Number(left) + Number(right)}`)
			} else if (message.content.includes("-")) {
				left = message.content.split("-")[0]
				right = message.content.split("-")[1]
				if (isNaN(left) || isNaN(right)) return;
				message.reply(`${left} - ${right} = ${Number(left) - Number(right)}`)
			} else if (message.content.includes("*")) {
				left = message.content.split("*")[0]
				right = message.content.split("*")[1]
				if (isNaN(left) || isNaN(right)) return;
				message.reply(`${left} * ${right} = ${Number(left) * Number(right)}`)
			} else if (message.content.includes("/")) {
				left = message.content.split("/")[0]
				right = message.content.split("/")[1]
				if (isNaN(left) || isNaN(right)) return;
				message.reply(`${left} * ${right} = ${Number(left) * Number(right)}`)
			} else if (message.content.includes("^")){
				left = message.content.split("^")[0]
				right = message.content.split("^")[1]
				if (isNaN(left) || isNaN(right)) return;
				message.reply(`${left} ^ ${right} = ${Number(left) ** Number(right)}`)
			} else {
				return
			}
		}
	}
);

//カジノBOTの関数
function generateSlotResult() {
	const result = [];
	for (let i = 0; i < 3; i++) {
		const randomIndex = Math.floor(Math.random() * symbols.length)
		result.push(symbols[randomIndex])
	}
	return result
}

function evaluateSlotResult(result) {
	if(result[0] == result[1] && result[1] == result[2]){
		return 30n
	}else if(result[0] == result[1] || result[1] == result[2]){
		return 10n
	}else if(result[0] == result[2]){
		return 5n
	}else{
		return 0n
	}
}

function toJPUnit(num) {
	const str = num;
	if (str.length >= 216) {
		return "約" + `${formatBigInt(str)}`
	} else {
		let n = ""
		let count = 0
		let ptr = 0
		let kName = ["万","億","兆","京","垓","杼","穰","溝","澗","正","載","極","恒河沙","阿僧祇","那由他","不可思議","無量大数","無限超越数","無限超超越数","無限高次超越数","超限大数","超限超越大数","超限高次大数","超超限大数","超超限超越大数","超超限高次大数","超超超限大数","無辺数","無限大数","無限極数","無窮数","無限巨数","無涯数","無辺無数","無窮無数","無限超数","無辺超数","無尽数","無量超数","無辺絶数","無限絶数","イクカン","イガグン","レジギガス","イイググ","イガグググ","イカレジ","イカマニア","イガ","イグ","グイグイ","イクンカ","イカクンガ"]
		for (let i=str.length-1; i>=0; i--) {
			n = str.charAt(i) + n
			count++
			if(((count % 4) == 0) && (i != 0)) n = kName[ptr++]+n
		}
		return n
	}
}

function formatBigInt(num) {
	const str = num.toString();
	if (str.length >= 216) {
		const power = str.length - 1
		const mantissa = str.slice(0, 2) + '.' + str.slice(2, 5).padEnd(3, '0')
	  	return `${mantissa} * 10^${power}`
	} else {
		return str.toLocaleString()
	}
}

//osu!BOTの関数
function checkStrings(array) {
	const targetStrings = ['NM', 'EZ', 'HT', 'NF', 'HR', 'SD', 'DT', 'NC', 'FL', 'SO', 'PF', 'V2', 'TD', 'HD', 'FI', 'V1', 'V2', 'V3', 'V4', 'V5', 'V6', 'V7', 'V8', 'V9'];
	for (const element of array) {
		if (!targetStrings.includes(element)) {
			return false
		}
	}
	return true
}

function findDifferentElements(array1, array2) {
	if (array1.length > array2.length) {
		return null
	}
	if (array1.toString() == array2.toString()) {
		return null
	}
	for (let i = 0; i < array1.length; i++) {
		if (array1[i] !== array2[i]) {
			return array2[i]
		}
	}
	return null
}

//Qualfiedチェックをする関数(全mode対応)
async function checkqualfiedosu() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectosu = {
			mode: "osu",
			section: "qualified"
		};

		//検索結果を取得
		const qfdatalist = await v2.beatmap.search(objectosu);

		//検索結果からIDのみを取得
		let qfarray = [];
		for (const element of qfdatalist.beatmapsets) {
			qfarray.push(element.id)
		}

		//現在のQualfiedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentQFlistfile = fs.readFileSync(`./QualfiedBeatmaps/osu.txt`, 'utf8');
		const currentQFlistarray = currentQFlistfile.split(",");

		//先程の検索結果と現在のQualfiedのIDを比較し、違う物を取得
		const differentQF = findDifferentElements(currentQFlistarray, qfarray);
		fs.writeFileSync(`./QualfiedBeatmaps/osu.txt`, qfarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentQF == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let QFbeatmapsmaxsrId;
		let QFbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentQF).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			QFbeatmapsmaxsrId = maxRatingObj.id;
			QFbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (QFbeatmapsmaxsrId == undefined || QFbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(QFbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(QFbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(QFbeatmapsmaxsrId, 0, "osu");
		const minsr = await calculateSR(QFbeatmapsminsrId, 0, "osu");
		const maxppDT = await calculateSR(QFbeatmapsmaxsrId, 64, "osu");
		const minppDT = await calculateSR(QFbeatmapsminsrId, 64, "osu");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;

		//QF時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//Ranked時(予測)の日時(７日後)を取得
		const sevenDaysLater = new Date(now);
		sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
		const rankedmonth = sevenDaysLater.getMonth() + 1;
		const rankedday = sevenDaysLater.getDate();
		const rankedhours = sevenDaysLater.getHours();
		const rankedminutes = sevenDaysLater.getMinutes();
		const rankeddateString = `${rankedmonth}月${rankedday}日 ${rankedhours}時${rankedminutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Blue")
			.setAuthor({ name: `🎉New Qualfied Osu Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Qualfied 日時`", value: `**${dateString}**`, inline: true })
			.addFields({ name: "`Ranked 日時(予測)`", value: `**${rankeddateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/osu/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkqualfiedtaiko() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objecttaiko = {
			mode: "taiko",
			section: "qualified"
		};

		//検索結果を取得
		const qfdatalist = await v2.beatmap.search(objecttaiko);

		//検索結果からIDのみを取得
		let qfarray = [];
		for (const element of qfdatalist.beatmapsets) {
			qfarray.push(element.id)
		}

		//現在のQualfiedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentQFlistfile = fs.readFileSync(`./QualfiedBeatmaps/taiko.txt`, 'utf8');
		const currentQFlistarray = currentQFlistfile.split(",");

		//先程の検索結果と現在のQualfiedのIDを比較し、違う物を取得
		const differentQF = findDifferentElements(currentQFlistarray, qfarray);
		fs.writeFileSync(`./QualfiedBeatmaps/taiko.txt`, qfarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentQF == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let QFbeatmapsmaxsrId;
		let QFbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentQF).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			QFbeatmapsmaxsrId = maxRatingObj.id;
			QFbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (QFbeatmapsmaxsrId == undefined || QFbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(QFbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(QFbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(QFbeatmapsmaxsrId, 0, "taiko");
		const minsr = await calculateSR(QFbeatmapsminsrId, 0, "taiko");
		const maxppDT = await calculateSR(QFbeatmapsmaxsrId, 64, "taiko");
		const minppDT = await calculateSR(QFbeatmapsminsrId, 64, "taiko");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;


		//QF時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//Ranked時(予測)の日時(７日後)を取得
		const sevenDaysLater = new Date(now);
		sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
		const rankedmonth = sevenDaysLater.getMonth() + 1;
		const rankedday = sevenDaysLater.getDate();
		const rankedhours = sevenDaysLater.getHours();
		const rankedminutes = sevenDaysLater.getMinutes();
		const rankeddateString = `${rankedmonth}月${rankedday}日 ${rankedhours}時${rankedminutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Blue")
			.setAuthor({ name: `🎉New Qualfied Taiko Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Qualfied 日時`", value: `**${dateString}**`, inline: true })
			.addFields({ name: "`Ranked 日時(予測)`", value: `**${rankeddateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/taiko/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkqualfiedcatch() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectfruits = {
			mode: "fruits",
			section: "qualified"
		};

		//検索結果を取得
		const qfdatalist = await v2.beatmap.search(objectfruits);

		//検索結果からIDのみを取得
		let qfarray = [];
		for (const element of qfdatalist.beatmapsets) {
			qfarray.push(element.id)
		}

		//現在のQualfiedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentQFlistfile = fs.readFileSync(`./QualfiedBeatmaps/catch.txt`, 'utf8');
		const currentQFlistarray = currentQFlistfile.split(",");

		//先程の検索結果と現在のQualfiedのIDを比較し、違う物を取得
		const differentQF = findDifferentElements(currentQFlistarray, qfarray);
		fs.writeFileSync(`./QualfiedBeatmaps/catch.txt`, qfarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentQF == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let QFbeatmapsmaxsrId;
		let QFbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentQF).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			QFbeatmapsmaxsrId = maxRatingObj.id;
			QFbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (QFbeatmapsmaxsrId == undefined || QFbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(QFbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(QFbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(QFbeatmapsmaxsrId, 0, "catch");
		const minsr = await calculateSR(QFbeatmapsminsrId, 0, "catch");
		const maxppDT = await calculateSR(QFbeatmapsmaxsrId, 64, "catch");
		const minppDT = await calculateSR(QFbeatmapsminsrId, 64, "catch");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;


		//QF時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//Ranked時(予測)の日時(７日後)を取得
		const sevenDaysLater = new Date(now);
		sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
		const rankedmonth = sevenDaysLater.getMonth() + 1;
		const rankedday = sevenDaysLater.getDate();
		const rankedhours = sevenDaysLater.getHours();
		const rankedminutes = sevenDaysLater.getMinutes();
		const rankeddateString = `${rankedmonth}月${rankedday}日 ${rankedhours}時${rankedminutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Blue")
			.setAuthor({ name: `🎉New Qualfied Catch Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Qualfied 日時`", value: `**${dateString}**`, inline: true })
			.addFields({ name: "`Ranked 日時(予測)`", value: `**${rankeddateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/catch/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkqualfiedmania() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectmania = {
			mode: "mania",
			section: "qualified"
		};

		//検索結果を取得
		const qfdatalist = await v2.beatmap.search(objectmania);

		//検索結果からIDのみを取得
		let qfarray = [];
		for (const element of qfdatalist.beatmapsets) {
			qfarray.push(element.id)
		}

		//現在のQualfiedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentQFlistfile = fs.readFileSync(`./QualfiedBeatmaps/mania.txt`, 'utf8');
		const currentQFlistarray = currentQFlistfile.split(",");

		//先程の検索結果と現在のQualfiedのIDを比較し、違う物を取得
		const differentQF = findDifferentElements(currentQFlistarray, qfarray);
		fs.writeFileSync(`./QualfiedBeatmaps/mania.txt`, qfarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentQF == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let QFbeatmapsmaxsrId;
		let QFbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentQF).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			QFbeatmapsmaxsrId = maxRatingObj.id;
			QFbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (QFbeatmapsmaxsrId == undefined || QFbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(QFbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(QFbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(QFbeatmapsmaxsrId, 0, "mania");
		const minsr = await calculateSR(QFbeatmapsminsrId, 0, "mania");
		const maxppDT = await calculateSR(QFbeatmapsmaxsrId, 64, "mania");
		const minppDT = await calculateSR(QFbeatmapsminsrId, 64, "mania");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;


		//QF時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//Ranked時(予測)の日時(７日後)を取得
		const sevenDaysLater = new Date(now);
		sevenDaysLater.setDate(sevenDaysLater.getDate() + 7);
		const rankedmonth = sevenDaysLater.getMonth() + 1;
		const rankedday = sevenDaysLater.getDate();
		const rankedhours = sevenDaysLater.getHours();
		const rankedminutes = sevenDaysLater.getMinutes();
		const rankeddateString = `${rankedmonth}月${rankedday}日 ${rankedhours}時${rankedminutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Blue")
			.setAuthor({ name: `🎉New Qualfied Mania Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Qualfied 日時`", value: `**${dateString}**`, inline: true })
			.addFields({ name: "`Ranked 日時(予測)`", value: `**${rankeddateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/mania/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

//Rankedチェックをする関数(全mode対応)
async function checkrankedosu() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectosu = {
			mode: "osu",
			section: "ranked"
		};

		//検索結果を取得
		const rankeddatalist = await v2.beatmap.search(objectosu);

		//検索結果からIDのみを取得
		let rankedarray = [];
		for (const element of rankeddatalist.beatmapsets) {
			rankedarray.push(element.id)
		}

		//現在のRankedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentrankedlistfile = fs.readFileSync(`./RankedBeatmaps/osu.txt`, 'utf8');
		const currentrankedlistarray = currentrankedlistfile.split(",");

		//先程の検索結果と現在のRankedのIDを比較し、違う物を取得
		const differentranked = findDifferentElements(currentrankedlistarray, rankedarray);
		fs.writeFileSync(`./RankedBeatmaps/osu.txt`, rankedarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentranked == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let rankedbeatmapsmaxsrId;
		let rankedbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentranked).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			rankedbeatmapsmaxsrId = maxRatingObj.id;
			rankedbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (rankedbeatmapsmaxsrId == undefined || rankedbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(rankedbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(rankedbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(rankedbeatmapsmaxsrId, 0, "osu");
		const minsr = await calculateSR(rankedbeatmapsminsrId, 0, "osu");
		const maxppDT = await calculateSR(rankedbeatmapsmaxsrId, 64, "osu");
		const minppDT = await calculateSR(rankedbeatmapsminsrId, 64, "osu");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;


		//ranked時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉New Ranked Osu Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Ranked 日時`", value: `**${dateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/osu/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkrankedtaiko() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objecttaiko = {
			mode: "taiko",
			section: "ranked"
		};

		//検索結果を取得
		const rankeddatalist = await v2.beatmap.search(objecttaiko);

		//検索結果からIDのみを取得
		let rankedarray = [];
		for (const element of rankeddatalist.beatmapsets) {
			rankedarray.push(element.id)
		}

		//現在のRankedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentrankedlistfile = fs.readFileSync(`./RankedBeatmaps/taiko.txt`, 'utf8');
		const currentrankedlistarray = currentrankedlistfile.split(",");

		//先程の検索結果と現在のRankedのIDを比較し、違う物を取得
		const differentranked = findDifferentElements(currentrankedlistarray, rankedarray);
		fs.writeFileSync(`./RankedBeatmaps/taiko.txt`, rankedarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentranked == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let rankedbeatmapsmaxsrId;
		let rankedbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentranked).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			rankedbeatmapsmaxsrId = maxRatingObj.id;
			rankedbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (rankedbeatmapsmaxsrId == undefined || rankedbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(rankedbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(rankedbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(rankedbeatmapsmaxsrId, 0, "taiko");
		const minsr = await calculateSR(rankedbeatmapsminsrId, 0, "taiko");
		const maxppDT = await calculateSR(rankedbeatmapsmaxsrId, 64, "taiko");
		const minppDT = await calculateSR(rankedbeatmapsminsrId, 64, "taiko");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;

		//ranked時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉New Ranked Taiko Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Ranked 日時`", value: `**${dateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/taiko/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkrankedcatch() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectcatch = {
			mode: "fruits",
			section: "ranked"
		};

		//検索結果を取得
		const rankeddatalist = await v2.beatmap.search(objectcatch);

		//検索結果からIDのみを取得
		let rankedarray = [];
		for (const element of rankeddatalist.beatmapsets) {
			rankedarray.push(element.id)
		}

		//現在のRankedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentrankedlistfile = fs.readFileSync(`./RankedBeatmaps/catch.txt`, 'utf8');
		const currentrankedlistarray = currentrankedlistfile.split(",");

		//先程の検索結果と現在のRankedのIDを比較し、違う物を取得
		const differentranked = findDifferentElements(currentrankedlistarray, rankedarray);
		fs.writeFileSync(`./RankedBeatmaps/catch.txt`, rankedarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentranked == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let rankedbeatmapsmaxsrId;
		let rankedbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentranked).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			rankedbeatmapsmaxsrId = maxRatingObj.id;
			rankedbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (rankedbeatmapsmaxsrId == undefined || rankedbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(rankedbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(rankedbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(rankedbeatmapsmaxsrId, 0, "catch");
		const minsr = await calculateSR(rankedbeatmapsminsrId, 0, "catch");
		const maxppDT = await calculateSR(rankedbeatmapsmaxsrId, 64, "catch");
		const minppDT = await calculateSR(rankedbeatmapsminsrId, 64, "catch");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;

		//ranked時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉New Ranked Catch Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Ranked 日時`", value: `**${dateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/catch/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

async function checkrankedmania() {
	try {
		//V2にアクセスするためのログイン処理
		await auth.login(osuclientid, osuclientsecret);

		//検索でmodeなどの条件を決める
		const objectmania = {
			mode: "mania",
			section: "ranked"
		};

		//検索結果を取得
		const rankeddatalist = await v2.beatmap.search(objectmania);

		//検索結果からIDのみを取得
		let rankedarray = [];
		for (const element of rankeddatalist.beatmapsets) {
			rankedarray.push(element.id)
		}

		//現在のRankedのIDを取得(ローカルファイルから１分前の物を取得)
		const currentrankedlistfile = fs.readFileSync(`./RankedBeatmaps/mania.txt`, 'utf8');
		const currentrankedlistarray = currentrankedlistfile.split(",");

		//先程の検索結果と現在のRankedのIDを比較し、違う物を取得
		const differentranked = findDifferentElements(currentrankedlistarray, rankedarray);
		fs.writeFileSync(`./RankedBeatmaps/mania.txt`, rankedarray.join(","), 'utf-8');

		//違う物がなかった場合(Null)の処理
		if (differentranked == null) return;

		//違う物があった場合の処理(SRやPPの計算過程)
		let rankedbeatmapsmaxsrId;
		let rankedbeatmapsminsrId;

		//BeatmapIdを取得
		await v2.beatmap.set(differentranked).then(async (res) => {
			const array = res.beatmaps;
			array.sort((a, b) => a.difficulty_rating - b.difficulty_rating);
			const maxRatingObj = array[array.length - 1];
			const minRatingObj = array[0];
			rankedbeatmapsmaxsrId = maxRatingObj.id;
			rankedbeatmapsminsrId = minRatingObj.id;
		});

		//なんらかのエラーでundefinedだった場合の処理
		if (rankedbeatmapsmaxsrId == undefined || rankedbeatmapsminsrId == undefined) return;

		//マップ情報を取得(タイトルなど)
		const GetMapInfo = await getMapforRecent(rankedbeatmapsmaxsrId, apikey, "0");
		const GetMapInfomin = await getMapforRecent(rankedbeatmapsminsrId, apikey, "0");
		const maxsr = await calculateSR(rankedbeatmapsmaxsrId, 0, "mania");
		const minsr = await calculateSR(rankedbeatmapsminsrId, 0, "mania");
		const maxppDT = await calculateSR(rankedbeatmapsmaxsrId, 64, "mania");
		const minppDT = await calculateSR(rankedbeatmapsminsrId, 64, "mania");
		const BPM = `${GetMapInfo.bpm}BPM (DT ${(GetMapInfo.bpm * 1.5).toFixed(0)}BPM)`;
		const minobject = GetMapInfomin.combo;
		const maxobject = GetMapInfo.combo;
		let Objectstring;
		if (minobject == maxobject) {
			Objectstring = `${maxobject}`
		} else {
			Objectstring = `${minobject} ~ ${maxobject}`
		}
		const lengthsec = GetMapInfo.totallength;
		const lengthsecDT = GetMapInfo.totallength / 1.5;
		const maptime = timeconvert(lengthsec);
		const maptimeDT = timeconvert(lengthsecDT);
		const maptimestring = `${maptime.minutes}:${maptime.seconds} (DT ${maptimeDT.minutes}:${maptimeDT.seconds})`;

		//ranked時の日時を取得
		const now = new Date();
		const month = now.getMonth() + 1;
		const day = now.getDate();
		const hours = now.getHours();
		const minutes = now.getMinutes();
		const dateString = `${month}月${day}日 ${hours}時${minutes}分`;

		//表示用の文字列を作成
		let srstring;
		let ppstring;
		if (maxsr.sr == minsr.sr) {
			srstring = `★${maxsr.sr} (DT ★${maxppDT.sr})`
		} else {
			srstring = `★${minsr.sr} ~ ${maxsr.sr} (DT ★${minppDT.sr} ~ ${maxppDT.sr})`
		}
		if (maxsr.S0 == minsr.S0) {
			ppstring = `${maxsr.S0}pp (DT ${maxppDT.S0}pp)`
		} else {
			ppstring = `${minsr.S0} ~ ${maxsr.S0}pp (DT ${minppDT.S0} ~ ${maxppDT.S0}pp)`
		}

		//メッセージの送信
		const embed = new EmbedBuilder()
			.setColor("Yellow")
			.setAuthor({ name: `🎉New Ranked Mania Map🎉` })
			.setTitle(`${GetMapInfo.artist} - ${GetMapInfo.title} by ${GetMapInfo.mapper}`)
			.setThumbnail(`https://b.ppy.sh/thumb/${GetMapInfo.beatmapset_id}l.jpg`)
			.setURL(GetMapInfo.maplink)
			.addFields({ name: "`Mapinfo`", value: `BPM: **${BPM}**\nLength: **${maptimestring}**\nCombo: **${Objectstring}**`, inline: true })
			.addFields({ name: "`SR`", value: `**${srstring}**`, inline: false })
			.addFields({ name: "`PP`", value: `**${ppstring}**`, inline: false })
			.addFields({ name: "`Ranked 日時`", value: `**${dateString}**`, inline: true })
		for (const element of fs.readFileSync(`./MapcheckChannels/mania/Channels.txt`, 'utf8').split(" ").filter((function(channel) {return channel !== "";}))) {
			if (client.channels.cache.get(element) == undefined) continue;
			client.channels.cache.get(element).send({ embeds: [embed] });
		}
	} catch(e) {
		console.log(e)
		return
	}
}

//プログレスバー作成関数
function createProgressBar(percent) {
	const progress = parseInt((20 * percent / 100).toFixed(0));
	const emptyProgress = parseInt((20 * (100 - percent) / 100).toFixed(0));
	const progressText = "#".repeat(progress);
	const emptyProgressText = "-".repeat(emptyProgress);
	return `[${progressText}${emptyProgressText}]`
}

//バックアップを1時間ごとに作成する関数
async function makeBackup() {
	const now = new Date();
	const year = now.getFullYear();
	const month = now.getMonth() + 1;
	const day = now.getDate();
	const hours = now.getHours();
	const minutes = now.getMinutes();
	const dateString = `${year}-${month}-${day} ${hours} ${minutes}`;
	await fs.mkdir(`./Backups/${dateString}`)
	await fs.mkdir(`./Backups/${dateString}/Player infomation`)
	await fs.mkdir(`./Backups/${dateString}/MapcheckChannels`)
	await fs.mkdir(`./Backups/${dateString}/BeatmapLinkChannels`)
	await fs.mkdir(`./Backups/${dateString}/Player Bank`)
	await fs.mkdir(`./Backups/${dateString}/tag`)
	await fs.copy(`./Player infomation`, `./Backups/${dateString}/Player infomation`)
	await fs.copy(`./MapcheckChannels`, `./Backups/${dateString}/MapcheckChannels`)
	await fs.copy(`./BeatmapLinkChannels`, `./Backups/${dateString}/BeatmapLinkChannels`)
	await fs.copy(`./Player Bank`, `./Backups/${dateString}/Player Bank`)
	await fs.copy(`./tag`, `./Backups/${dateString}/tag`)
	await fs.copy(`./quotetag`, `./Backups/${dateString}/quotetag`)
}

//時間を分と秒に変換する関数
function timeconvert(totallength) {
	let lengthminutes = Math.floor(totallength / 60).toString();
	let remainingSeconds = Math.round(totallength % 60).toString();
	if (remainingSeconds.length == 1) {
		remainingSeconds = ('00' + remainingSeconds).slice(-2)
	}
	return {
		minutes: lengthminutes,
		seconds: remainingSeconds
	}
}

function matchPercentage(current, total) {
	const data = total.replace(current, "")
    return (total.length - data.length) / total.length * 100
}

//discord bot login
client.login(token);
