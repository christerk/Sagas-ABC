declare var ipc: any;
declare var $: any;

ipc.on('LanguageSet', (event: any, data: any) => {
    console.log('Received LanguageSet command');
    let translations:any = {};
    for (let d in data) {
        translations[d] = data[d];
    }

    let tags = document.querySelectorAll("[i18n]");
    tags.forEach((el: Element, key: number, parent: NodeListOf<Element>) => {
        let translation = translations[el.getAttribute('i18n')];
        switch(el.nodeName.toLowerCase()) {
            case "input":
                el.setAttribute('value', translation);
                break;
            default:
                el.innerHTML = translation;
                break;
        }
    });
});

ipc.on('state', (event: any, data: any) => {
    let tags = document.querySelectorAll("[bind]");
    tags.forEach((el: any, key: number, parent: NodeListOf<Element>) => {
        let binding = el.getAttribute('bind');
        let value = data[binding];
        if (value !== undefined) {
            switch(el.nodeName.toLowerCase()) {
                case 'button':
                    if (el.getAttribute('data-toggle') === 'dropdown') {
                        console.log('Setting dropdown to ' + value);
                        $(el).text($(el).parent().find('[data-value='+value+']').text());
                    }
                    break;
                default:
                    el.innerHTML = value;
                    break;
            }
        }
    });
});

ipc.on('ShowDialog', (event: any, data: any) => {
    let el = $('#'+data);
    if (el.length > 0) {
        $('#'+data).modal();
    }
})

var timer: any;
ipc.on('Message', (event: any, data: any) => {
    if (timer) {
        clearTimeout(timer);
    }
    if (data != null) {
        $('#message').text(data).show('fast');
        timer = setTimeout(() => { $('#message').hide('fast') }, 5000);
    } else {
        $('#message').html('&nbsp;');
    }
})