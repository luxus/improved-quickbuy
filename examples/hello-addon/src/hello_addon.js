// Hello Addon: the smallest Addon Settings client. Its settings show as a "Hello" tab in the ADDONS menu
// (placement 'addons', the default). build.sh puts the library in front of this.
// Texts starting with '#' are tokens: the game's loc files first, else STRINGS in the game's language,
// else English. Plain texts (no '#') show as they are.
const STRINGS = {
	english: { Hello_Enable: 'Enable', Hello_Enable_Desc: 'Show the greeting.', Hello_Look: 'Look', Hello_Size: 'Text Size', Hello_Corner: 'Corner', Hello_TopLeft: 'Top left', Hello_TopRight: 'Top right' },
	german: { Hello_Enable: 'Aktivieren', Hello_Enable_Desc: 'Den Gruss anzeigen.', Hello_Look: 'Aussehen', Hello_Size: 'Textgrösse', Hello_Corner: 'Ecke', Hello_TopLeft: 'Oben links', Hello_TopRight: 'Oben rechts' }
};
const hello = AddonSettings.register({
	id: 'hello_addon', title: 'Hello', prefix: 'Hello', toggle: 'enabled', strings: STRINGS,
	controls: [
		{ key: 'enabled', type: 'toggle', section: 'Hello', title: '#Hello_Enable', desc: '#Hello_Enable_Desc', default: true },
		{ key: 'size', type: 'slider', section: '#Hello_Look', title: '#Hello_Size', min: 12, max: 40, step: 2, default: 20, needs: ['enabled'] },
		{ key: 'corner', type: 'select', section: '#Hello_Look', title: '#Hello_Corner', default: 'top-left', needs: ['enabled'],
			options: [{ value: 'top-left', label: '#Hello_TopLeft' }, { value: 'top-right', label: '#Hello_TopRight' }] }
	]
}, values => apply(values)); // runs with the saved values once they are loaded, and on every change

function apply(values) { // the addon's own work; here: remember the values on our panel
	$.GetContextPanel().SetAttributeString('hello_values', JSON.stringify(values));
}
apply(hello.values()); // the defaults until the saved values arrive
