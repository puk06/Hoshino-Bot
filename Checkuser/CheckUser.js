const fs = require("fs")

module.exports.checkFileExists = async (filePath) => {
    try{
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    }catch(e){
        return false;
    };
};
