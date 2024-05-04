'use strict';
'require view';
'require fs';
'require ui';
'require poll';

return view.extend({

    refreshData: function () {

        var promises = [

            // get the pjsip registrations
            fs.exec_direct('/usr/sbin/asterisk', ['-rx', 'pjsip show registrations']).catch(function (err) {
                ui.addNotification(null, E('p', {}, _('Unable to execute command <em>/usr/sbin/asterisk -rx "pjsip show registrations"</em>: ' + err.message)));
                return null;
            }),

            // get the pjsip auths
            fs.exec_direct('/usr/sbin/asterisk', ['-rx', 'pjsip show auths']).catch(function (err) {
                ui.addNotification(null, E('p', {}, _('Unable to execute command <em>/usr/sbin/asterisk -rx "pjsip show auths"</em>: ' + err.message)));
                return null;
            }),

            // get the pjsip contacts
            fs.exec_direct('/usr/sbin/asterisk', ['-rx', 'pjsip show contacts']).catch(function (err) {
                ui.addNotification(null, E('p', {}, _('Unable to execute command <em>/usr/sbin/asterisk -rx "pjsip show contacts"</em>: ' + err.message)));
                return null;
            }),
        ];

        var res = Promise.all(promises).then(function (results) {

            // parse the registrations
            if (results != null && results[0] != null) {
                var lines = results[0].split('\n').filter(line => line.trim() !== '' && !line.includes('=')).slice(1, -1);
                var registrations = lines.map(line => {
                    const [registrationServerUri, auth, status, expSeconds] = line.trim().split(/\s{2,}/);
                    const [registration, serverUri] = registrationServerUri.split('/');
                    return [registration, `sip:${serverUri}`, auth, status, expSeconds.replace('(exp. ', '').replace('s)', '')];
                });
            }
            else {
                registrations = [];
            }

            // parse the auths
            if (results != null && results[1] != null) {
                var lines = results[1].split('\n').filter(line => line.trim() !== '' && !line.includes('=')).slice(1, -1);
                var auths = lines.map(line => {
                    const [ioauth, authIdUsername] = line.trim().split(/\s{2,}/);
                    const [authId, username] = authIdUsername.split('/');
                    return [authId, username];
                });
            }
            else {
                auths = [];
            }

            // parse the contacts
            if (results != null && results[2] != null) {
                var lines = results[2].split('\n').filter(line => line.trim() !== '' && !line.includes('=')).slice(1, -1);
                var contacts = lines.map(line => {
                    const [contact, aorContactUri, hash, status, rtt] = line.trim().split(/\s{1,}/);
                    const [aor, contactUri] = aorContactUri.split('/');
                    return [aor, contactUri, status, rtt];
                });
            }
            else {
                contacts = [];
            }

            return [registrations, auths, contacts];
        });

        return res;
    },

    load: function () {
        return this.refreshData();
    },

    buildRegistrationTable: function (rows) {

        // create the table
        var table = E('table', { 'id': 'registrationTable', 'class': 'table', 'style': 'text-wrap: nowrap;' },
            [
                E('thead', { 'class': 'thead' },
                    E('tr', { 'class': 'tr table-titles' },
                        [
                            E('th', { 'class': 'th' }, _('Registration')),
                            E('th', { 'class': 'th' }, _('ServerURI')),
                            E('th', { 'class': 'th' }, _('Auth')),
                            E('th', { 'class': 'th' }, _('Status')),
                            E('th', { 'class': 'th' }, _('Expiration'))
                        ]
                    )
                )
            ]);

        // update the table with the rows
        cbi_update_table(table, rows, E('em', 'no data available'));

        return table;
    },

    buildAuthTable: function (rows) {

        // create the table
        var table = E('table', { 'id': 'authTable', 'class': 'table', 'style': 'text-wrap: nowrap;' },
            [
                E('thead', { 'class': 'thead' },
                    E('tr', { 'class': 'tr table-titles' },
                        [
                            E('th', { 'class': 'th' }, _('AuthId')),
                            E('th', { 'class': 'th' }, _('Username'))
                        ]
                    )
                )
            ]);

        // update the table with the rows
        cbi_update_table(table, rows, E('em', 'no data available'));

        return table;
    },

    buildContactTable: function (rows) {

        // create the table
        var table = E('table', { 'id': 'contactTable', 'class': 'table', 'style': 'text-wrap: nowrap;' },
            [
                E('thead', { 'class': 'thead' },
                    E('tr', { 'class': 'tr table-titles' },
                        [
                            E('th', { 'class': 'th' }, _('AOR')),
                            E('th', { 'class': 'th' }, _('ContactURI')),
                            E('th', { 'class': 'th' }, _('Status')),
                            E('th', { 'class': 'th' }, _('RTT(ms)'))
                        ]
                    )
                )
            ]);

        // update the table with the rows
        cbi_update_table(table, rows, E('em', 'no data available'));

        return table;
    },

    render: function (data) {

        var registrations = data[0];
        var auths = data[1];
        var contacts = data[2];

        var body = E([
            E('h2', _('Asterisk overview')),
            E('p', { 'class': 'cbi-section-descr' }, _('This page shows some Asterisk information.'))
        ]);

        if (registrations) {
            body.appendChild(E('div', {}, [
                E('h3', _('PJSIP registrations')),
                E('p', {}, _('This shows the PJSIP registrations.'))
            ]));

            // add the registration table
            var registrationTable = this.buildRegistrationTable(registrations);
            body.appendChild(registrationTable);
        }

        if (auths) {
            body.appendChild(E('div', {}, [
                E('h3', _('PJSIP auths')),
                E('p', {}, _('This shows the PJSIP auths.'))
            ]));

            // add the auth table
            var authTable = this.buildAuthTable(auths);
            body.appendChild(authTable);
        }

        if (contacts) {
            body.appendChild(E('div', {}, [
                E('h3', _('PJSIP contacts')),
                E('p', {}, _('This shows the PJSIP contacts.'))
            ]));

            // add the contact table
            var contactTable = this.buildContactTable(contacts);
            body.appendChild(contactTable);
        }

        // start polling
        poll.add(this.refresh.bind(this));

        return body;
    },

    refresh: function () {
        this.refreshData().then(function (data) {

            var view = document.querySelector('#view');

            // find the registration table element and replace it with the updated table
            var oldRegistrationTable = view.querySelector('#registrationTable');
            var newRegistrationTable = this.buildRegistrationTable(data[0]);
            view.replaceChild(newRegistrationTable, oldRegistrationTable);

            // find the auth table element and replace it with the updated table
            var oldAuthTable = view.querySelector('#authTable');
            var newAuthTable = this.buildAuthTable(data[1]);
            view.replaceChild(newAuthTable, oldAuthTable);

            // find the contact table element and replace it with the updated table
            var oldContactTable = view.querySelector('#contactTable');
            var newContactTable = this.buildContactTable(data[2]);
            view.replaceChild(newContactTable, oldContactTable);

        }.bind(this));
    },

    handleSaveApply: null,
    handleSave: null,
    handleReset: null
});
