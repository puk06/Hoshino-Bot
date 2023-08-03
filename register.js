const { REST, Routes } = require('discord.js');
require('dotenv').config();
const applicationId = process.env.APPLICATIONID;
const token = process.env.TOKEN;
const commanddata = require('./commands.js');
const rest = new REST({ version: '10' }).setToken(token);

(async () => {
    try {
        console.log('コマンドを登録中...');
        let commands = [];
        for (const element of commanddata) {
            commands.push(element.data.toJSON());
        }
        await rest.put(
            Routes.applicationCommands(applicationId),
            { body: commands },
        );
        console.log('コマンドの登録が完了しました');
    } catch (error) {
        console.error('コマンドの登録中にエラーが発生しました:', error);
    }
})();
