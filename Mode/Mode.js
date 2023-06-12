module.exports.modeconvert = (mode) => {
    if(mode == "osu"){
        return "0"
    }else if(mode == "taiko"){
        return "1"
    }else if(mode == "ctb"){
        return "2"
    }else if(mode == "mania"){
        return "3"
    }else if(mode == "0"){
        return "osu"
    }else if(mode == "1"){
        return "taiko"
    }else if(mode == "2"){
        return "ctb"
    }else if(mode == "3"){
        return "mania"
    }else if(mode == "o"){
        return "0"
    }else if(mode == "t"){
        return "1"
    }else if(mode == "c"){
        return "2"
    }else if(mode == "m"){
        return "3"
    }else{
        return "nomode"
    };
};
