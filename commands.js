const { SlashCommandBuilder } = require("./node_modules/discord.js")

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName("slot")
            .setDescription("スロットを回します。")
            .addStringOption(option =>
                option
                    .setName('betamount')
                    .setDescription('賭け金額')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("safeslot")
            .setDescription("スロットを回します。負けても報酬が0ではないです。")
            .addStringOption(option =>
                option
                    .setName('betamount')
                    .setDescription('賭け金額')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("bankranking")
            .setDescription("銀行口座残高の桁数ランキングを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("lv")
            .setDescription("カジノのレベルを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("recoshot")
            .setDescription("recoコマンドで出る金額を自動で賭け金額に設定します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("reco")
            .setDescription("おすすめの賭け金額を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("bank")
            .setDescription("現在の銀行口座残高を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("amount")
            .setDescription("数値を漢字で表示します。")
            .addStringOption(option =>
                option
                    .setName('amount')
                    .setDescription('数値')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("regcasino")
            .setDescription("カジノに登録できます。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("send")
            .setDescription("指定したユーザーにお金を送ります。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('送りたい人の名前')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('amount')
                    .setDescription('送りたい金額')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("dice")
            .setDescription("さいころを振ります。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("roulette")
            .setDescription("ルーレットを回します。赤か黒を出します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("kemo")
            .setDescription("保存されたFurry画像をランダムで表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("kemodelete")
            .setDescription("Furryフォルダから指定された画像を削除します。")
            .addNumberOption(option =>
                option
                    .setName('count')
                    .setDescription('削除したい画像のカウント')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("kemocount")
            .setDescription("Furryフォルダの総ファイル数を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("pic")
            .setDescription("指定されたタグの画像をランダムで表示します。")
            .addStringOption(option =>
                option
                    .setName('tag')
                    .setDescription('タグ名')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("settag")
            .setDescription("このチャンネル名、チャンネルをpicタグに設定します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("deltag")
            .setDescription("このチャンネルをタグから削除します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("delpic")
            .setDescription("指定された画像を削除します。")
            .addNumberOption(option =>
                option
                    .setName('count')
                    .setDescription('削除したい画像のカウント')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("piccount")
            .setDescription("送られたチャンネルのタグの総ファイル数を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("downloadtag")
            .setDescription("送られたチャンネルのタグの画像をダウンロードします。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("alltags")
            .setDescription("全てのタグ一覧を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("quote")
            .setDescription("指定されたタグの名言を表示します。")
            .addStringOption(option =>
                option
                    .setName('tag')
                    .setDescription('タグ名')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("setquotetag")
            .setDescription("このチャンネル名を名言タグに設定します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("delquotetag")
            .setDescription("このチャンネル名を名言タグから削除します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("delquote")
            .setDescription("指定された名言を削除します。")
            .addStringOption(option =>
                option
                    .setName('quote')
                    .setDescription('削除したい名言')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("quotecount")
            .setDescription("送られたチャンネルの名言タグの総名言数を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("allquotetags")
            .setDescription("全ての名言タグ一覧を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("kunii")
            .setDescription("文章の先頭を入れ替えます。")
            .addStringOption(option =>
                option
                    .setName('content')
                    .setDescription('入れ替えたい文章')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("link")
            .setDescription("リンクが送信されたら、マップ情報を表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("unlink")
            .setDescription("リンクが送信されても、マップ情報は表示しなくなります。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("check")
            .setDescription("送られたマップの1/4ストリームの最大の長さを表示します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("ispp")
            .setDescription("PPマップかどうかを表示します。FPという単位で表示されます。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mods')
                    .setDescription('Mod')
                    .setRequired(false)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("lb")
            .setDescription("Mod別ランキングを表示します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mods')
                    .setDescription('Mod')
                    .setRequired(false)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("qf")
            .setDescription("送られたチャンネルをQF、rankチャンネルに設定します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("loved")
            .setDescription("送られたチャンネルをLovedチャンネルに設定します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("qfmention")
            .setDescription("Qualfiedが検出されたらメンションします。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("lovedmention")
            .setDescription("Lovedが検出されたらメンションします。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("rankedmention")
            .setDescription("Rankedが検出されたらメンションします。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("deqf")
            .setDescription("送られたチャンネルをQF、rankチャンネルから削除します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("deloved")
            .setDescription("送られたチャンネルをLovedチャンネルから削除します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("deqfmention")
            .setDescription("Qualfiedが検出されたらメンションするのを解除します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("derankedmention")
            .setDescription("Rankedが検出されたらメンションするのを解除します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("delovevmention")
            .setDescription("Lovedが検出されたらメンションするのを解除します。")
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("bg")
            .setDescription("送られたマップのBGを表示します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("ifmod")
            .setDescription("送られたマップのユーザーの最高記録のModを変更してランキングを計算します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mods')
                    .setDescription('Mod')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(false)
            )
            .addStringOption(option =>
                option
                    .setName('score')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'Top Score', value: '0' },
                        { name: 'Top PP', value: '1' }
                    )
                    .setRequired(false)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("srchart")
            .setDescription("送られたマップのSRグラフを表示します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("preview")
            .setDescription("マップのプレビューリンクを表示します。")
            .addStringOption(option =>
                option
                    .setName('beatmaplink')
                    .setDescription('マップリンク')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("calculatepp")
            .setDescription("送られたosuマップのPPを計算します。")
            .addAttachmentOption(option =>
                option
                    .setName('beatmapfile')
                    .setDescription('マップファイル')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mods')
                    .setDescription('Mod')
                    .setRequired(false)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("osubgquiz")
            .setDescription("送られたユーザー、モードからBGクイズを出題します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("osubgquizpf")
            .setDescription("送られたユーザー、モードからBGクイズを出題します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("osuquiz")
            .setDescription("送られたユーザー、モードからBGクイズを出題します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("osuquizpf")
            .setDescription("送られたユーザー、モードからBGクイズを出題します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("quizend")
            .setDescription("クイズを終了します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("osusearch")
            .setDescription("osu!のビートマップを検索します。")
            .addStringOption(option =>
                option
                    .setName('query')
                    .setDescription('検索したいキーワード')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('mode')
                    .setDescription('モード')
                    .addChoices(
                        { name: 'osu!', value: 'osu' },
                        { name: 'osu!taiko', value: 'taiko' },
                        { name: 'osu!catch', value: 'catch' },
                        { name: 'osu!mania', value: 'mania' }
                    )
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("osureg")
            .setDescription("osu!のユーザー名をほしのbotに登録します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("slayer")
            .setDescription("スレイヤーの周回数などを表示します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('slayername')
                    .setDescription('スレイヤー名')
                    .addChoices(
                        { name: 'Revenant Horror', value: 'Revenant Horror' },
                        { name: 'Sven Packmaster', value: 'Sven Packmaster' },
                        { name: 'Voidgloom Seraph', value: 'Voidgloom Seraph' },
                        { name: 'Inferno Demonlord', value: 'Inferno Demonlord' },
                        { name: 'Riftstalker Bloodfiend', value: 'Riftstalker Bloodfiend' },
                    )
                    .setRequired(true)
            )
            .addNumberOption(option =>
                option
                    .setName('profileid')
                    .setDescription('プロファイルID')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("profile")
            .setDescription("プレイヤーのSkyblockプロファイルを表示します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("skyblockpatch")
            .setDescription("Hypixel Skyblockの最新のパッチノートを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("loc")
            .setDescription("GitHubのリポジトリのLOCを表示します。")
            .addStringOption(option =>
                option
                    .setName('username')
                    .setDescription('ユーザー名')
                    .setRequired(true)
            )
            .addStringOption(option =>
                option
                    .setName('repository')
                    .setDescription('リポジトリ名')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("backup")
            .setDescription("バックアップを復元できます。管理者専用です。")
            .addNumberOption(option =>
                option
                    .setName('backuptime')
                    .setDescription('何時間前のバックアップを復元するか')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("backuplist")
            .setDescription("バックアップの一覧を表示します。管理者専用です。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("backupcreate")
            .setDescription("バックアップを作成します。管理者専用です。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("update")
            .setDescription("サーバーデータを更新します。管理者専用です。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("allupdate")
            .setDescription("全てのサーバーデータを更新します。管理者専用です。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("echo")
            .setDescription("メッセージをあなたの代わりに送信します。")
            .addStringOption(option =>
                option
                    .setName('message')
                    .setDescription('送りたいメッセージ')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("talkcount")
            .setDescription("あなたがどのくらいこのサーバーで喋ったかを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("talkranking")
            .setDescription("このサーバーでの、話した回数のランキングを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("talklevel")
            .setDescription("あなたのこのサーバーでの話した回数をレベルを表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("talklevelranking")
            .setDescription("このサーバーでの、話した回数のレベルランキングを表示します。")
    },
]
