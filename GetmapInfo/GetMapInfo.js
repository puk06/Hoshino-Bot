//require ribrary
const axios = require("axios");
const { modeconvert } = require("../Mode/Mode");

module.exports.getMapInfo = async (maplink, apikey, mods) => {
	const beatmapId = maplink.split("#")[1].split("/")[1];
	const response = await axios.get(
		`https://osu.ppy.sh/api/get_beatmaps?k=${apikey}&b=${beatmapId}`
	);
	const data = response.data;
	let lengthsec = data[0].total_length;
	if(mods.includes("DT") || mods.includes("NC")){
		lengthsec /=  1.5;
	}
	const time = convertSecond(lengthsec);
	return {
		sr: parseFloat(parseFloat(data[0].difficultyrating).toFixed(2)),
		combo: parseInt(data[0].max_combo),
		od: parseFloat(parseFloat(data[0].diff_overall).toFixed(2)),
		title: data[0].title,
		artist: data[0].artist,
		version: data[0].version,
		mapper: data[0].creator,
		bpm: parseFloat(parseFloat(data[0].bpm).toFixed(0)),
		cs: parseInt(data[0].diff_size),
		ar: parseInt(data[0].diff_approach),
		hp: parseInt(data[0].diff_drain),
		maplink: maplink,
		totallength: parseInt(lengthsec),
		lengthmin: time.minutes,
		lengthsec: time.seconds,
		approved: parseInt(data[0].approved),
		beatmapId: parseInt(beatmapId),
		beatmapset_id: parseInt(data[0].beatmapset_id),
		mode: parseInt(data[0].mode),
		countnormal: parseInt(data[0].count_normal),
		countslider: parseInt(data[0].count_slider),
		countspinner: parseInt(data[0].count_spinner),
		favouritecount: parseInt(data[0].favourite_count),
		playcount: parseInt(data[0].playcount)
	};
};

module.exports.getMapforRecent = async (beatmapId, apikey, mods) => {
	try{
		const response = await axios.get(
			`https://osu.ppy.sh/api/get_beatmaps?k=${apikey}&b=${beatmapId}`
		);
		const data = response.data;
		let lengthsec = data[0].total_length;
		if(mods.includes("DT") || mods.includes("NC")){
			lengthsec /=  1.5;
		};
		const time = convertSecond(lengthsec);
		return {
			sr: parseFloat(parseFloat(data[0].difficultyrating).toFixed(2)),
			combo: parseInt(data[0].max_combo),
			od: parseFloat(parseFloat(data[0].diff_overall).toFixed(2)),
			title: data[0].title,
			artist: data[0].artist,
			version: data[0].version,
			mapper: data[0].creator,
			bpm: parseFloat(parseFloat(data[0].bpm).toFixed(0)),
			cs: parseInt(data[0].diff_size),
			ar: parseInt(data[0].diff_approach),
			hp: parseInt(data[0].diff_drain),
			maplink: `https://osu.ppy.sh/beatmapsets/${data[0].beatmapset_id}#${modeconvert(data[0].mode)}/${beatmapId}`,
			totallength: parseInt(lengthsec),
			lengthmin: time.minutes,
			lengthsec: time.seconds,
			approved: parseInt(data[0].approved),
			beatmapId: parseInt(beatmapId),
			beatmapset_id: parseInt(data[0].beatmapset_id),
			mode: parseInt(data[0].mode),
			countnormal: parseInt(data[0].count_normal),
			countslider: parseInt(data[0].count_slider),
			countspinner: parseInt(data[0].count_spinner),
			favouritecount: parseInt(data[0].favourite_count),
			playcount: parseInt(data[0].playcount)
		};
	}catch(e){
		console.log(e);
		return 0;
	};
};

module.exports.mapstatus = (approved) => {
	if(approved == 4){
	return "Loved"
	}else if(approved == 3){
	return "Qualified"
	}else if(approved == 2){
	return "Approved"
	}else if(approved == 1){
	return "Ranked"
	}else if(approved == 0){
	return "pending"
	}else if(approved == -1){
	return "WIP"
	}else if(approved == -2){
	return "Graveyard"
	}else{
	return "Unknown"
	};
};

function convertSecond(seconds) {
	const minutes = Math.floor(seconds / 60); // 秒数を分に変換
	const remainingSeconds = seconds % 60; // 分に変換したあとの余りの秒数
	return {
		minutes: minutes,
		seconds: remainingSeconds
	};
};

module.exports.getMapInfowithoutmods = async (maplink, apikey) => {
	try {
		const beatmapId = maplink.split("#")[1].split("/")[1];
		const response = await axios.get(
			`https://osu.ppy.sh/api/get_beatmaps?k=${apikey}&b=${beatmapId}`
		);
		const data = response.data;
		let lengthsec = data[0].total_length;
		const time = convertSecond(lengthsec);
		return {
			sr: parseFloat(parseFloat(data[0].difficultyrating).toFixed(2)),
			combo: parseInt(data[0].max_combo),
			od: parseFloat(parseFloat(data[0].diff_overall).toFixed(2)),
			title: data[0].title,
			artist: data[0].artist,
			version: data[0].version,
			mapper: data[0].creator,
			bpm: parseFloat(parseFloat(data[0].bpm).toFixed(0)),
			cs: parseInt(data[0].diff_size),
			ar: parseInt(data[0].diff_approach),
			hp: parseInt(data[0].diff_drain),
			maplink: maplink,
			totallength: parseInt(lengthsec),
			lengthmin: time.minutes,
			lengthsec: time.seconds,
			approved: parseInt(data[0].approved),
			beatmapId: parseInt(beatmapId),
			beatmapset_id: parseInt(data[0].beatmapset_id),
			mode: parseInt(data[0].mode),
			countnormal: parseInt(data[0].count_normal),
			countslider: parseInt(data[0].count_slider),
			countspinner: parseInt(data[0].count_spinner),
			favouritecount: parseInt(data[0].favourite_count),
			playcount: parseInt(data[0].playcount)
		};
	}catch(e){
		console.log(e);
		return 0;
	};
};
