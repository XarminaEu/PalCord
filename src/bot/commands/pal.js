const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');

const de = require('../../i18n/de');
const en = require('../../i18n/en');

function l10n(key) {
  return { 'de': de[key] || key, 'en-US': en[key] || key };
}

function l10nChoices(choices) {
  return choices.map(c => ({
    name: c.name,
    name_localizations: { 'de': c.de, 'en-US': c.en },
    value: c.value,
  }));
}

const data = new SlashCommandBuilder()
  .setName('pal')
  .setDescription('PalCord - Palworld Server Management')
  .setDescriptionLocalizations({ 'de': 'PalCord - Palworld Server Management', 'en-US': 'PalCord - Palworld Server Management' })
  .addSubcommand(sub =>
    sub
      .setName('server')
      .setDescription(l10n('cmd_server_status')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_server_status'))
  )
  .addSubcommand(sub =>
    sub
      .setName('players')
      .setDescription(l10n('cmd_player_list')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_player_list'))
      .addIntegerOption(opt =>
        opt.setName('page').setDescription('Page').setDescriptionLocalizations({ 'de': 'Seite', 'en-US': 'Page' }).setMinValue(1).setRequired(false)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('shop')
      .setDescription(l10n('cmd_open_shop')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_open_shop'))
  )
  .addSubcommand(sub =>
    sub
      .setName('balance')
      .setDescription(l10n('cmd_show_balance')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_show_balance'))
  )
  .addSubcommand(sub =>
    sub
      .setName('give')
      .setDescription(l10n('cmd_give')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_give'))
  )
  .addSubcommand(sub =>
    sub
      .setName('admin')
      .setDescription(l10n('cmd_admin')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_admin'))
  )
  .addSubcommand(sub =>
    sub
      .setName('whitelist')
      .setDescription(l10n('cmd_whitelist')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_whitelist'))
  )
  .addSubcommand(sub =>
    sub
      .setName('setup')
      .setDescription(l10n('cmd_setup')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_setup'))
      .addChannelOption(opt =>
        opt.setName('channel').setDescription('Channel for the status embed').setDescriptionLocalizations({ 'de': 'Channel für den Status-Embed', 'en-US': 'Channel for the status embed' }).setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('link')
      .setDescription(l10n('cmd_link_account')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_link_account'))
      .addStringOption(opt =>
        opt.setName('userid').setDescription('Your Palworld UserId / SteamID').setDescriptionLocalizations({ 'de': 'Deine Palworld UserId / SteamID', 'en-US': 'Your Palworld UserId / SteamID' }).setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('language')
      .setDescription(l10n('cmd_language')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_language'))
      .addStringOption(opt =>
        opt.setName('lang').setDescription('Language').setDescriptionLocalizations({ 'de': 'Sprache', 'en-US': 'Language' }).setRequired(true)
          .setChoices(...l10nChoices([
            { name: 'Deutsch', de: 'Deutsch', en: 'German', value: 'de' },
            { name: 'English', de: 'Englisch', en: 'English', value: 'en' },
          ]))
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('base')
      .setDescription('Manage your own base with coordinates')
      .setDescriptionLocalizations({ 'de': 'Eigene Basis mit Koordinaten verwalten', 'en-US': 'Manage your own base with coordinates' })
      .addStringOption(opt =>
        opt.setName('action').setDescription('Action').setDescriptionLocalizations({ 'de': 'Aktion', 'en-US': 'Action' }).setRequired(true)
          .setChoices(...l10nChoices([
            { name: 'Add', de: 'Hinzufügen', en: 'Add', value: 'add' },
            { name: 'List', de: 'Liste', en: 'List', value: 'list' },
            { name: 'Delete', de: 'Löschen', en: 'Delete', value: 'delete' },
            { name: 'Main base', de: 'Hauptbasis', en: 'Main base', value: 'setmain' },
          ]))
      )
      .addStringOption(opt => opt.setName('name').setDescription('Base name').setDescriptionLocalizations({ 'de': 'Basis Name', 'en-US': 'Base name' }).setRequired(false))
      .addNumberOption(opt => opt.setName('x').setDescription('X coordinate').setDescriptionLocalizations({ 'de': 'X Koordinate', 'en-US': 'X coordinate' }).setRequired(false))
      .addNumberOption(opt => opt.setName('y').setDescription('Y coordinate').setDescriptionLocalizations({ 'de': 'Y Koordinate', 'en-US': 'Y coordinate' }).setRequired(false))
      .addNumberOption(opt => opt.setName('z').setDescription('Z coordinate (optional)').setDescriptionLocalizations({ 'de': 'Z Koordinate (optional)', 'en-US': 'Z coordinate (optional)' }).setRequired(false))
      .addIntegerOption(opt => opt.setName('id').setDescription('Base ID for delete/main').setDescriptionLocalizations({ 'de': 'Basis ID für Löschen/Hauptbasis', 'en-US': 'Base ID for delete/main' }).setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('profile')
      .setDescription(l10n('cmd_profile')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_profile'))
  )
  .addSubcommand(sub =>
    sub
      .setName('leaderboard')
      .setDescription(l10n('cmd_leaderboard')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_leaderboard'))
      .addStringOption(opt =>
        opt.setName('type').setDescription('Category').setDescriptionLocalizations({ 'de': 'Kategorie', 'en-US': 'Category' }).setRequired(false)
          .setChoices(...l10nChoices([
            { name: 'Coins', de: 'Coins', en: 'Coins', value: 'coins' },
            { name: 'Playtime', de: 'Spielzeit', en: 'Playtime', value: 'playtime' },
            { name: 'Level', de: 'Level', en: 'Level', value: 'level' },
          ]))
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('daily')
      .setDescription(l10n('cmd_daily')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_daily'))
  )
  .addSubcommand(sub =>
    sub
      .setName('pay')
      .setDescription(l10n('cmd_pay')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_pay'))
      .addUserOption(opt => opt.setName('user').setDescription('Discord user').setDescriptionLocalizations({ 'de': 'Discord User', 'en-US': 'Discord user' }).setRequired(true))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount').setDescriptionLocalizations({ 'de': 'Menge', 'en-US': 'Amount' }).setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('basesetup')
      .setDescription(l10n('cmd_basesetup')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_basesetup'))
      .addChannelOption(opt =>
        opt.setName('channel').setDescription('Channel for the bases embed').setDescriptionLocalizations({ 'de': 'Channel für das Basen-Embed', 'en-US': 'Channel for the bases embed' }).setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('chatbridge')
      .setDescription(l10n('cmd_chatbridge')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_chatbridge'))
      .addChannelOption(opt =>
        opt.setName('channel').setDescription('Channel for the chat bridge').setDescriptionLocalizations({ 'de': 'Channel für die Chat-Bridge', 'en-US': 'Channel for the chat bridge' }).setRequired(true)
      )
  )
  .addSubcommand(sub =>
    sub
      .setName('about')
      .setDescription(l10n('cmd_about')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_about'))
  );

module.exports = {
  data,
};
