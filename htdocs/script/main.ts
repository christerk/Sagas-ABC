declare var ipc: any;
declare var $: any;

let currentMode: any;

document.addEventListener('DOMContentLoaded',() => {
    $('#startbutton').click((ev:any) => {
        ipc.send('StartClicked', true);

        //$('#startDialog').modal();
    });

    $('#sessiontext-dropdown').on('click', 'a', (ev: any) => {
        let selectedItem = $(ev.target);
        let selectedText = selectedItem.text();
        let selectedVal = selectedItem.data('value');

        ipc.send('SelectSessionText', selectedVal);
    });


    // -- PREFERENCES --
    $('#language-dropdown a').click((ev: any) => {
        let selectedItem = $(ev.target);
        let selectedText = selectedItem.text();
        let selectedVal = selectedItem.data('value');

        ipc.send('SetLanguage', selectedVal);
    });

    $('#bookfolder').on('click', (event:Event) => {
        ipc.send('ChangeBookFolder', null);
    });

    $('#openbookfolder').on('click', (event:Event) => {
        ipc.send('OpenBookFolder', null);
    });

    $('#startRegularSession').on('click', () => {
        ipc.send('StartSession', 'Regular');
    });

    $('#startRepetitionSession').on('click', () => {
        ipc.send('StartSession', 'Repetition');
    });

    $('#endSession').on('click', () => {
        ipc.send('Nav', 'End');
    })

    $(window).on('keydown', (ev:any) => {
        switch(ev.key) {
            case 'Escape':
                if (currentMode !== 'Start') {
                    $('#endDialog').modal();
                }
                break;
            case 'ArrowUp':
            case 'ArrowLeft':
                ipc.send('Nav', 'Back');
                break;
            case 'ArrowDown':
            case 'ArrowRight':
            case ' ':
                ipc.send('Nav', 'NextOk');
                break;
            case 'Enter':
                ipc.send('Nav', 'NextFail');
                break;
            case 'Delete':
            case 'Backspace':
                ipc.send('Nav', 'NextSuccess');
                break;
            default:
            console.log(ev);
            break;        
        }
    })

    $(document).on('mousedown', (ev:any) => {
        let el = ev.toElement;
        let n = el.nodeName.toLowerCase();
        if (n == "html" || (n == "div" && el.id == "word")) {
            ev.stopPropagation();
            ev.preventDefault();
            let button = ev.button;
            switch(button) {
                case 0:
                    ipc.send('Nav', 'NextOk');
                    break;
                case 2:
                    ipc.send('Nav', 'Undo');
                    break;
            }
            return true;
        }
    })

    ipc.on('state', (event: any, data: any) => {
        let newMode = data['app.mode'];
        if (newMode && newMode !== currentMode) {
            currentMode = newMode;
            switch(currentMode) {
                case 'Start':
                    $('.footer').hide();
                    break;
                case 'Regular':
                    $('.footer').show();
                    break;
                case 'Repetition':
                    $('.footer').show();
                    break;
            }
        }
    });

    ipc.on('Books', (event: any, books: any) => {
        let list = $('#booklist');

        list.children().slice(1).remove();

        if (books) {
            for (let i=0; i<books.length; i++) {
                if (books[i] === 'default') {
                    continue;
                }
                $('#booklist').append(
                    $('<a class="dropdown-item" href="#"/>')
                    .addClass('dropdown-item')
                    .attr('data-value', books[i])
                    .text(books[i])
                );
            }
        }
    });
})
