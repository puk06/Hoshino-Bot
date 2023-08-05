//必要なライブラリの読み込み
const axios = require("../../node_modules/axios");

module.exports.getplayersdata = async (apikey, username, mode) =>{
    const response = await axios.get(`https://osu.ppy.sh/api/get_user?&k=${apikey}&type=string&m=${mode}&u=${username}`);
    const playerdata = response.data;
    const data = playerdata[0];
    if (data == undefined){
        return undefined
    }
    return {
        user_id: parseInt(data.user_id),
        username: data.username,
        join_date: data.join_date,
        count300: parseInt(data.count300),
        count100: parseInt(data.count100),
        count50: parseInt(data.count50),
        playcount: parseInt(data.playcount),
        ranked_score: parseInt(data.ranked_score),
        total_score: parseInt(data.total_score),
        pp_rank: parseInt(data.pp_rank),
        pp_raw: parseFloat(parseFloat(data.pp_raw).toFixed(1)),
        accuracy: parseFloat(parseFloat(data.accuracy).toFixed(2)),
        count_rank_ss: parseInt(data.count_rank_ss),
        count_rank_ssh: parseInt(data.count_rank_ssh),
        count_rank_s: parseInt(data.count_rank_s),
        count_rank_sh: parseInt(data.count_rank_sh),
        count_rank_a: parseInt(data.count_rank_a),
        country: data.country,
        total_seconds_played : parseInt(data.total_seconds_played),
        pp_country_rank: parseInt(data.pp_country_rank),
        iconurl: `https://a.ppy.sh/${data.user_id}`,
        playerurl: `https://osu.ppy.sh/users/${data.user_id}`
    }
}

module.exports.getplayerscore = async (apikey, beatmapId, username, mode) => {
    const response = await axios.get(`https://osu.ppy.sh/api/get_scores?b=${beatmapId}&k=${apikey}&m=${mode}&type=string&u=${username}`);
    const responsedata = response.data;
    const responsescore = responsedata[0];
    if (responsescore === undefined) {
        return undefined
    }
    return {
        score_id: parseInt(responsescore.score_id),
        score: parseInt(responsescore.score),
        username: responsescore.username,
        count300: parseInt(responsescore.count300),
        count100: parseInt(responsescore.count100),
        count50: parseInt(responsescore.count50),
        countmiss: parseInt(responsescore.countmiss),
        maxcombo: parseInt(responsescore.maxcombo),
        countkatu: parseInt(responsescore.countkatu),
        countgeki: parseInt(responsescore.countgeki),
        perfect: parseInt(responsescore.perfect),
        enabled_mods: parseInt(responsescore.enabled_mods),
        user_id: parseInt(responsescore.user_id),
        date: responsescore.date,
        rank: responsescore.rank,
        pp: parseFloat(parseFloat(responsescore.pp).toFixed(2)),
        replay_available : parseInt(responsescore.replay_available),
        maplink: `https://osu.ppy.sh/beatmapsets/${beatmapId}`
    }
}
