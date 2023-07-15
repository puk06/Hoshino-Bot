//必要なライブラリの読み込み
const fs = require("fs")

//ファイルの存在チェック
module.exports.checkFileExists = async (filePath) => {
    try{
        fs.accessSync(filePath, fs.constants.F_OK);
        return true;
    }catch(e){
        return false;
    };
};
