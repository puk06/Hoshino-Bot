//必要なライブラリの読み込み
const axios = require("../../node_modules/axios");

module.exports.GetMapScore = async (beatmapid, mods, apikey, mode) => {
    const responce = await axios.get(`https://osu.ppy.sh/api/get_scores?k=${apikey}&b=${beatmapid}&m=${mode}&mods=${mods}&limit=5`);
    return responce.data
}
