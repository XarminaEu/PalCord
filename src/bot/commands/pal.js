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
  )
  .addSubcommand(sub =>
    sub
      .setName('stats')
      .setDescription(l10n('cmd_stats')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_stats'))
      .addUserOption(opt => opt.setName('user').setDescription('Discord user (optional)').setDescriptionLocalizations({ 'de': 'Discord User (optional)', 'en-US': 'Discord user (optional)' }).setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('announce')
      .setDescription(l10n('cmd_announce')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_announce'))
      .addStringOption(opt => opt.setName('message').setDescription('Message to announce').setDescriptionLocalizations({ 'de': 'Nachricht für Broadcast', 'en-US': 'Message to announce' }).setRequired(true))
  )
  .addSubcommand(sub =>
    sub
      .setName('rules')
      .setDescription(l10n('cmd_rules')['en-US'])
      .setDescriptionLocalizations(l10n('cmd_rules'))
      .addStringOption(opt => opt.setName('set').setDescription('New rules text (admin only)').setDescriptionLocalizations({ 'de': 'Neue Regeln (nur Admin)', 'en-US': 'New rules text (admin only)' }).setRequired(false))
  )
  .addSubcommand(sub =>
    sub
      .setName('giveaway')
      .setDescription('Giveaway erstellen oder verwalten')
      .setDescriptionLocalizations({ 'de': 'Giveaway erstellen oder verwalten', 'en-US': 'Create or manage giveaways' })
      .addStringOption(opt =>
        opt.setName('action').setDescription('Action').setDescriptionLocalizations({ 'de': 'Aktion', 'en-US': 'Action' }).setRequired(true)
          .setChoices(...l10nChoices([
            { name: 'Create', de: 'Erstellen', en: 'Create', value: 'create' },
            { name: 'List', de: 'Liste', en: 'List', value: 'list' },
          ]))
      )
      .addStringOption(opt => opt.setName('prize').setDescription('Prize name').setDescriptionLocalizations({ 'de': 'Preisname', 'en-US': 'Prize name' }).setRequired(false))
      .addStringOption(opt =>
        opt.setName('type').setDescription('Prize type').setDescriptionLocalizations({ 'de': 'Preistyp', 'en-US': 'Prize type' }).setRequired(false)
          .setChoices(...l10nChoices([
            { name: 'Item', de: 'Item', en: 'Item', value: 'item' },
            { name: 'Pal', de: 'Pal', en: 'Pal', value: 'pal' },
            { name: 'Egg', de: 'Ei', en: 'Egg', value: 'egg' },
            { name: 'Relic', de: 'Relikt', en: 'Relic', value: 'relic' },
            { name: 'Tech Points', de: 'Tech Punkte', en: 'Tech Points', value: 'techpoints' },
            { name: 'Ancient Tech Points', de: 'Ancient Tech Punkte', en: 'Ancient Tech Points', value: 'ancienttechpoints' },
            { name: 'EXP', de: 'EXP', en: 'EXP', value: 'exp' },
            { name: 'Coins', de: 'Coins', en: 'Coins', value: 'coins' },
          ]))
      )
      .addStringOption(opt => opt.setName('prizeid').setDescription('Item/Pal ID').setDescriptionLocalizations({ 'de': 'Item/Pal ID', 'en-US': 'Item/Pal ID' }).setRequired(false))
      .addIntegerOption(opt => opt.setName('amount').setDescription('Amount or level').setDescriptionLocalizations({ 'de': 'Menge oder Level', 'en-US': 'Amount or level' }).setMinValue(1).setRequired(false))
      .addStringOption(opt => opt.setName('egg').setDescription('Egg type for eggs').setDescriptionLocalizations({ 'de': 'Ei-Typ', 'en-US': 'Egg type' }).setRequired(false))
      .addIntegerOption(opt => opt.setName('winners').setDescription('Number of winners').setDescriptionLocalizations({ 'de': 'Anzahl Gewinner', 'en-US': 'Number of winners' }).setMinValue(1).setMaxValue(10).setRequired(false))
      .addIntegerOption(opt => opt.setName('minutes').setDescription('Duration in minutes').setDescriptionLocalizations({ 'de': 'Dauer in Minuten', 'en-US': 'Duration in minutes' }).setMinValue(1).setMaxValue(10080).setRequired(false))
  );

module.exports = {
  data,
};
