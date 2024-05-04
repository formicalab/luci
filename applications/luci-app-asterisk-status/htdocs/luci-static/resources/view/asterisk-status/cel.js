'use strict';
'require view';
'require fs';
'require ui';
'require poll';

return view.extend({

        refreshData: function () {

                var promises = [
                        fs.read_direct('/etc/asterisk/cel_custom.conf', 'text').catch(function (err) {
                                ui.addNotification(null, E('p', {}, _('Unable to read file <em>/etc/asterisk/cel_custom.conf</em>: ' + err.message)));
                                return null;
                        }),
                        fs.read_direct('/var/log/asterisk/cel-custom/Master.csv', 'text').catch(function (err) {
                                ui.addNotification(null, E('p', {}, _('Unable to read file <em>/var/log/asterisk/cel-custom/Master.csv</em>: ' + err.message)));
                                return null;
                        })];

                var res = Promise.all(promises).then(function (results) {

                        // parse the [mappings] block and extract the headers
                        var confData = results[0];
                        var fields = [];
                        if (confData && confData.trim() != '') {
                                var regex = /[mappings]*\$\{([^{}]+)\}/g;
                                var match;
                                while ((match = regex.exec(confData)) !== null) {
                                        fields.push(match[1]);
                                }
                        }

                        // parse the CSV file
                        var csvData = results[1];
                        if (csvData && csvData.trim() != '') {
                                var lines = csvData.split('\n');
                                var rows = lines.map(function (line) {
                                        var regex = /("(?:[^"]|"")*"|\{"(?:[^"]|"")*"(?:,\s*"(?:[^"]|"")*")*\})/g;
                                        var columns = [];
                                        var match;
                                        while ((match = regex.exec(line)) !== null) {
                                                // If the match is a quoted string, remove the quotes
                                                var column = match[0].startsWith('"') && match[0].endsWith('"') ? match[0].slice(1, -1) : match[0];

                                                // if the column has two double quotes, remove one of them
                                                column = column.replace(/""/g, '"');

                                                // add the column to the columns array
                                                columns.push(column);
                                        }
                                        return columns;
                                });
                        }
                        else {
                                rows = [];
                        }

                        return [fields, rows];
                });

                return res;
        },

        load: function () {
                return this.refreshData();
        },

        buildTable: function (fields, rows) {

                // Sort the rows by the 'eventtime' field
                if (rows && rows != []) {
                        // find the column index of the 'eventtime' field
                        var dateIndex = fields.indexOf('eventtime');
                        if (dateIndex != -1) {
                                // Sort rows by the second column (date) in descending order
                                rows.sort(function (a, b) {
                                        var dateA = new Date(a[dateIndex]);
                                        var dateB = new Date(b[dateIndex]);
                                        return dateB - dateA;
                                });
                        }
                }

                // Create the table headers from the fields array
                var tableHeaders = fields.map(function (field) {
                        return E('th', { 'class': 'th' }, field);
                });


                // create the table
                var table = E('table', { 'class': 'table', 'style': 'text-wrap: nowrap; display: block; overflow-x: scroll; overflow-y: scroll; height: 70vh;' },
                        [
                                E('thead', { 'class': 'thead', 'style': 'position: sticky; top: 0; z-index: 1;' },
                                        E('tr', { 'class': 'tr table-titles' }, tableHeaders)
                                )
                        ]);

                // update the table with the rows
                cbi_update_table(table, rows, E('em', 'no data available'));

                return table;
        },

        render: function (data) {

                var fields = data[0];
                var rows = data[1];

                // page title and description
                var body = E([
                        E('h2', _('Asterisk Channel Event Logging (CEL)')),
                        E('p', { 'class': 'cbi-section-descr' }, _('This page shows the list of phone calls with detailed events, from custom CEL file <em>/var/log/asterisk/cel-custom/Master.csv</em>.<br>Click on the column headers to sort the table.'))
                ]);

                // buttons and info row

                var btnRefresh = E('button', {
                        'id': 'btnRefresh',
                        'class': 'cbi-button cbi-button-neutral',
                        'click': ui.createHandlerFn(this, 'refresh'),
                        'style': 'margin-top: 10px; margin-bottom: 10px;'
                }, _('Refresh'))

                var btnClear = E('button', {
                        'id': 'btnClear',
                        'class': 'cbi-button cbi-button-neutral',
                        'click': ui.createHandlerFn(this, 'clear'),
                        'style': 'margin-left: auto; margin-top: 10px; margin-bottom: 10px;'
                }, _('Clear log'))

                body.appendChild(E('div', { 'style': 'display: flex; flex-direction: row; align-items: center; justify-content: space-between;'},
                [
                        btnRefresh,
                        E('span', {  'id' : 'numEntries', 'style': 'margin-left: 10px; margin-top: 10px; margin-bottom: 10px;' }, _('Events: ') + rows.length + '.'),
                        E('span', { 'id' : 'lastUpdate', 'style': 'margin-left: 10px; margin-top: 10px; margin-bottom: 10px;' }, _('Last update: ') + new Date().toLocaleString()),
                        btnClear
                ]));
                
                // add the table
                var table = this.buildTable(fields, rows);
                body.appendChild(table);

                // start polling
                poll.add(this.refresh.bind(this));

                return body;
        },

        refresh: function () {
                this.refreshData().then(function (data) {

                        // find the table element and replace it with the updated table
                        var view = document.querySelector('#view');
                        var oldTable = view.querySelector('table');
                        view.replaceChild(this.buildTable(data[0], data[1]), oldTable);

                        // update the number of events and last update time
                        var numEntries = document.querySelector('#numEntries');
                        numEntries.textContent = _('Events: ') + data[1].length + '.';
                        var lastUpdate = document.querySelector('#lastUpdate');
                        lastUpdate.textContent =  _('Last update: ') + new Date().toLocaleString();

                }.bind(this));
        },

        clear: function () {

                fs.exec_direct('/bin/dd', ['if=/dev/null', 'of=/var/log/asterisk/cel-custom/Master.csv']).then(function () {
                        this.refresh();
                        ui.addNotification(null, E('p', {}, _('Log cleared successfully.')));
                }.bind(this)).catch(function (err) {
                        ui.addNotification(null, E('p', {}, _('Failed to clear log: ' + err.message)));
                });
        },

        handleSaveApply: null,
        handleSave: null,
        handleReset: null
});