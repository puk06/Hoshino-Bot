//必要なライブラリの読み込み
const axios = require("axios");

//最近のプレイ情報を取得する関数
module.exports.Recentplay = async (apikey, player, mode) => {
    //osuのAPIからユーザーの最新のプレイ情報を取得
    const response = await axios.get(
        `https://osu.ppy.sh/api/get_user_recent?k=${apikey}&u=${player}&limit=1&m=${mode}&a=1&type=string`
    );

    //取得した情報をre変数に格納
    const re = response.data;

    //データがない(プレイされてない)場合はundefinedを返す
    if (re[0] == undefined) {
        return undefined
    }

    //取得した情報を返す
    return {
            beatmap_id: parseInt(re[0].beatmap_id),
            score: parseInt(re[0].score),
            maxcombo: parseInt(re[0].maxcombo),
            count50: parseInt(re[0].count50),
            count100: parseInt(re[0].count100),
            count300: parseInt(re[0].count300),
            countmiss: parseInt(re[0].countmiss),
            countkatu: parseInt(re[0].countkatu),
            countgeki: parseInt(re[0].countgeki),
            perfect: parseInt(re[0].perfect),
            enabled_mods: parseInt(re[0].enabled_mods),
            user_id: parseInt(re[0].user_id),
            date: re[0].date,
            rank: re[0].rank,
            totalhitcount: (parseInt(re[0].count300) + parseInt(re[0].count100) + parseInt(re[0].countmiss))
    }
}
