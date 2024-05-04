'use strict';
'require view';
'require fs';
'require ui';
'require poll';

return view.extend({

    refreshData: function () {

        var promises = [

            // get the pjsip channels
            fs.exec_direct('/usr/sbin/asterisk', ['-rx', 'pjsip show channels']).catch(function (err) {
                ui.addNotification(null, E('p', {}, _('Unable to execute command <em>/usr/sbin/asterisk -rx "pjsip show channels"</em>: ' + err.message)));
                return null;
            }),

            // get the pjsip channelstats
            fs.exec_direct('/usr/sbin/asterisk', ['-rx', 'pjsip show channelstats']).catch(function (err) {
                ui.addNotification(null, E('p', {}, _('Unable to execute command <em>/usr/sbin/asterisk -rx "pjsip show channelstats"</em>: ' + err.message)));
                return null;
            })
        ];

        var res = Promise.all(promises).then(function (results) {

            // parse the channels
            if (results != null && results[0] != null) {

                // Remove header and footer and split remaining text into pairs of lines
                var blocks = results[0].split('\n').filter(line => line.trim() !== '' && !line.includes('=')).slice(2, -1);
                var lines = [];
                for (let i = 0; i < blocks.length; i += 2) {
                    lines.push(blocks[i] + ' ' + blocks[i + 1] || '');
                }

                var channels = lines.map(line => {
                    const [channelId, state, time, dialedExten, connectedLineCID] = line.trim().split(/\s{2,}/);
                    return [channelId.replace('Channel: ',''), state.trim(), time.trim(), dialedExten.replace('Exten:',''), connectedLineCID.replace('CLCID: ','')];
                });
            }
            else {
                channels = [];
            }

            // parse the channelstats
            if (results != null && results[1] != null) {
                var lines = results[1].split('\n').filter(line => line.trim() !== '' && !line.includes('=')).slice(2, -1);
                var channelstats = lines.map(line => {
                    const [bridgeId, channelId, uptime, codec, receiveCount, receiveLost, receivePct, receiveJitter, sendCount, sendLost, sendPct, sendJitter, rtt] = line.trim().split(/\s{1,}/);
                    return [bridgeId, channelId, uptime, codec, receiveCount, receiveLost, receivePct, receiveJitter, sendCount, sendLost, sendPct, sendJitter, rtt];
                });
            }
            else {
                channelstats = [];
            }

            return [channels, channelstats];
        });

        return res;
    },

    load: function () {
        return this.refreshData();
    },

    buildChannelTable: function (rows) {

        // create the table
        var table = E('table', { 'id': 'channelTable', 'class': 'table', 'style': 'text-wrap: nowrap;' },
            [
                E('thead', { 'class': 'thead' },
                    E('tr', { 'class': 'tr table-titles' },
                        [
                            E('th', {}, _('Channel ID')),
                            E('th', { 'style': 'text-align: left;'}, _('State')),
                            E('th', { 'style': 'text-align: left;'}, _('Time')),
                            E('th', { 'style': 'text-align: left;'}, _('Dialed Exten')),
                            E('th', { 'style': 'text-align: left;'}, _('Connected Line CID'))
                        ]
                    )
                )
            ]);

        // update the table with the rows
        cbi_update_table(table, rows, E('em', 'no data available'));

        return table;
    },

    buildChannelstatTable: function (rows) {

        // create the table
        var table = E('table', { 'id': 'channelstatTable', 'class': 'table', 'style': 'text-wrap: nowrap;' },
            [
                E('thead', { 'class': 'thead' },
                    E('tr', { 'class': 'tr table-titles' },
                        [
                            E('th', {}, _('Bridge ID')),
                            E('th', {}, _('Channel ID')),
                            E('th', {}, _('Uptime')),
                            E('th', {}, _('Codec')),
                            E('th', {}, _('Receive<br>Count')),
                            E('th', {}, _('Receive<br>Lost')),
                            E('th', {}, _('Receive<br>Pct')),
                            E('th', {}, _('Receive<br>Jitter')),
                            E('th', {}, _('Send<br>Count')),
                            E('th', {}, _('Send<br>Lost')),
                            E('th', {}, _('Send<br>Pct')),
                            E('th', {}, _('Send<br>Jitter')),
                            E('th', {}, _('RTT'))
                        ]
                    )
                )
            ]);
        // update the table with the rows
        cbi_update_table(table, rows, E('em', 'no data available'));

        return table;
    },

    render: function (data) {

        var channels = data[0];
        var channelstats = data[1];

        var body = E([
            E('h2', _('Asterisk ongoing calls')),
            E('p', { 'class': 'cbi-section-descr' }, _('This page shows the ongoing calls.'))
        ]);

        if (channels != null) {
            body.appendChild(E('div', {}, [
                E('h3', _('Channels')),
                E('p', {}, _('This shows the established channels.'))
            ]));
            body.appendChild(this.buildChannelTable(channels));
        }

        if (channelstats != null) {
            body.appendChild(E('div', {}, [
                E('h3', _('Channel Stats')),
                E('p', {}, _('This shows the channel statistics.'))
            ]));
            body.appendChild(this.buildChannelstatTable(channelstats));
        }

        // start polling
        poll.add(this.refresh.bind(this));

        return body;
    },

    refresh: function () {
        this.refreshData().then(function (data) {

            var view = document.querySelector('#view');

            // find the channel table and replace it with the new one
            var oldChannelTable = view.querySelector('#channelTable');
            var newTable = this.buildChannelTable(data[0]);
            view.replaceChild(newTable, oldChannelTable);

            // find the channelstat table and replace it with the new one
            var oldChannelstatTable = view.querySelector('#channelstatTable');
            var newTable = this.buildChannelstatTable(data[1]);
            view.replaceChild(newTable, oldChannelstatTable);
        }.bind(this));
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
