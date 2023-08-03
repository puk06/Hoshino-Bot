const { SlashCommandBuilder } = require("./node_modules/discord.js")

module.exports = [
    {
        data: new SlashCommandBuilder()
            .setName("slot")
            .setDescription("スロットを回します。")
            .addNumberOption(option =>
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
            .addNumberOption(option =>
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
            .addNumberOption(option =>
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
            .addNumberOption(option =>
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
            .setDescription("Furry画像をランダムで表示します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("delete")
            .setDescription("Furryフォルダから指定された画像を削除します。")
            .addStringOption(option =>
                option
                    .setName('medialink')
                    .setDescription('削除したい画像のリンク')
                    .setRequired(true)
            )
    },
    {
        data: new SlashCommandBuilder()
            .setName("count")
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
            .setDescription("このチャンネル名をタグに設定します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("deltag")
            .setDescription("このチャンネル名をタグから削除します。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("delpic")
            .setDescription("指定された画像を削除します。")
            .addStringOption(option =>
                option
                    .setName('medialink')
                    .setDescription('削除したい画像のリンク')
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
            .setDescription("PPマップかどうかを表示します。")
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
    },
    {
        data: new SlashCommandBuilder()
            .setName("deqf")
            .setDescription("送られたチャンネルをQF、rankチャンネルから削除します。")
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
            .setName("update")
            .setDescription("サーバーデータを更新します。管理者専用です。")
    },
    {
        data: new SlashCommandBuilder()
            .setName("allupdate")
            .setDescription("全てのサーバーデータを更新します。管理者専用です。")
    },
]