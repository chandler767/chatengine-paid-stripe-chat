const chatInterface = document.getElementById('chat-interface');

const usernameModal = document.getElementById('username-input-modal');
const usernameInput = document.getElementById('username-input');
const joinButton = document.getElementById('join-button');

const usernameInputPayment = document.getElementById('username-input-paid');
const joinButtonPayment = document.getElementById('join-button-paid');
const cardElement = document.getElementById('card-element');

const onlineList = document.getElementById('online-list');
const chat = document.getElementById('chat');
const log = document.getElementById('log');
const messageInput = document.getElementById('message-input');
const submit = document.getElementById('submit');

const hide = 'hide';
const uuid = newUuid();

let username; // local user name

var processingPayment = false;

// Create a Stripe client.
var stripe = Stripe('pk_test_sL4tOMdvKxy7adblO2p4aPM7');

// Create an instance of Elements.
var elements = stripe.elements();

// Custom styling can be passed to options when creating an Element.
// (Note that this demo uses a wider set of styles than the guide below.)
var style = {
  base: {
    color: '#32325d',
    lineHeight: '18px',
    fontFamily: '"Helvetica Neue", Helvetica, sans-serif',
    fontSmoothing: 'antialiased',
    fontSize: '16px',
    '::placeholder': {
      color: '#aab7c4'
    }
  },
  invalid: {
    color: '#fa755a',
    iconColor: '#fa755a'
  }
};

// Create an instance of the card Element.
var card = elements.create('card', {style: style});

// Add an instance of the card Element into the `card-element` <div>.
card.mount('#card-element');

// Send a message when Enter key is pressed
messageInput.addEventListener('keydown', (event) => {
    if (event.keyCode === 13 && !event.shiftKey) {
        event.preventDefault();
        sendMessage();
        return;
    }
});

// Send a message when the submit button is clicked
submit.addEventListener('click', sendMessage);

// Disconnect ChatEngine before a user navigates away from the page
window.onbeforeunload = (event) => {
    ChatEngine.disconnect();
};

// Init ChatEngine
const ChatEngine = ChatEngineCore.create({
    publishKey: 'pub-c-3c140ec6-5470-4241-b3a0-10413e0f797c',
    subscribeKey: 'sub-c-6843106e-2985-11e9-991a-bee2ac9fced0'
}, {
    globalChannel: 'paid-chat-example'
});

// Init the WebRTC plugin and chat interface here
ChatEngine.on('$.ready', (data) => {
    let onlineUuids = [];

    // Add a user to the online list when they connect
    ChatEngine.global.on('$.online.*', (payload) => {
        if (payload.user.name === 'Me') {
            return;
        }

        const userId = payload.user.uuid;
        const name = payload.user.state.username;

        const userListDomNode = createUserListItem(userId, name);

        const index = onlineUuids.findIndex(id => id === payload.user.uuid);
        const alreadyInList = index > -1 ? true : false;

        if (!alreadyInList) {
            onlineUuids.push(payload.user.uuid);
        } else {
            return;
        }

        onlineList.appendChild(userListDomNode);
    });

    // Remove a user from the online list when they disconnect
    ChatEngine.global.on('$.offline.*', (payload) => {
        const index = onlineUuids.findIndex((id) => id === payload.user.uuid);
        onlineUuids.splice(index, 1);

        const div = document.getElementById(payload.user.uuid);
        if (div) div.remove();
    });

    // Render up to 20 old messages in the global chat
    ChatEngine.global.search({
        reverse: true,
        event: 'message',
        limit: 20
    }).on('message', renderMessage);

    // Render new messages in realtime
    ChatEngine.global.on('message', renderMessage);
});


// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// UI Render Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function renderMessage(message) {
    const messageDomNode = createMessageHTML(message);

    log.append(messageDomNode);

    // Sort messages in chat log based on their timetoken
    sortNodeChildren(log, 'id');

    chat.scrollTop = chat.scrollHeight;
}

usernameInput.addEventListener('keyup', (event) => {
    const nameLength = usernameInput.value.length;

    if (nameLength > 0) {
        joinButton.classList.remove('disabled');
    } else {
        joinButton.classList.add('disabled');
    }

    if (event.keyCode === 13) {
        joinButton.click();
    }
});

joinButton.addEventListener('click', (event) => {
    const nameLength = usernameInput.value.length;
    if (nameLength > 0) {
        if (checkUsernameAuth(usernameInput.value)) {
            username = usernameInput.value;
            usernameModal.classList.add(hide);

            // Connect ChatEngine.
            ChatEngine.connect(uuid, {
                username
            });
        } else {
            alert("Unable to join chat. Did you pay for access?")
        }
    }
});

// Handle real-time validation errors from the card Element.
card.addEventListener('change', function(event) {
  var displayError = document.getElementById('card-errors');
  if (event.error) {
    displayError.textContent = event.error.message;
  } else {
    displayError.textContent = '';
  }
  checkJoinButtonPayment();
});

// Check for completed card and username.
usernameInputPayment.addEventListener('keyup', (event) => {
    checkJoinButtonPayment();
    if (event.keyCode === 13) {
        joinButtonPayment.click();
    }
});

// Get token and process payment.
joinButtonPayment.addEventListener('click', (event) => {
    if (!processingPayment) {
        processingPayment = true;
        if (checkJoinButtonPayment()) {
            if (checkUsernameAuth(encodeURI(usernameInputPayment.value))) {
                alert("You have already paid and will not be charged again.");
                username = usernameInputPayment.value;
                usernameModal.classList.add(hide);
                // Connect ChatEngine.
                ChatEngine.connect(uuid, {
                    username
                });
            } else {
                stripe.createToken(card).then(function(result) {
                    if (result.error) {
                        // Inform the user if there was an error.
                        var errorElement = document.getElementById('card-errors');
                        errorElement.textContent = result.error.message;
                        processingPayment = false;
                    } else {
                        // Send the token to PubNub to process.
                        stripeTokenHandler(result.token);
                    }
                });
            } 
        }
    }
});

// Sent token to PubNub function to process.
function stripeTokenHandler(token) {
    var request = new XMLHttpRequest();
    request.open('POST', "https://pubsub.pubnub.com/v1/blocks/sub-key/sub-c-6843106e-2985-11e9-991a-bee2ac9fced0/stripe?username="+encodeURI(usernameInputPayment.value)+"&token="+token.id, true);
    request.onload = function () {
        if (this.status == 200) {
            alert("Thanks for paying.");
            username = usernameInputPayment.value;
            usernameModal.classList.add(hide);
            // Connect ChatEngine.
            ChatEngine.connect(uuid, {
                username
            });
        } else {
            alert("Could not process charge at this time. Please check your card and try again.")
            console.log(this.responseText)
            processingPayment = false;
        }
    };
    request.send();
}

// Check if the user has paid for access.
function checkUsernameAuth(username) {
    var request = new XMLHttpRequest();
    request.open('POST', "https://pubsub.pubnub.com/v1/blocks/sub-key/sub-c-6843106e-2985-11e9-991a-bee2ac9fced0/auth?username="+encodeURI(username), true);
    request.onload = function () {
        if (this.status == 200) {
            return true;
        } else {
            return false;
        }
    };
    request.send();
}

// Check that both inputs have been filled.
function checkJoinButtonPayment() {
    if (cardElement.classList.contains('StripeElement--complete')) {
        const nameLength = usernameInputPayment.value.length;
        if (nameLength > 0) {
            joinButtonPayment.classList.remove('disabled');
            return true;
        } else {
            joinButtonPayment.classList.add('disabled');
            return false;
        }
    } else {
        joinButtonPayment.classList.add('disabled');
        return false;
    }
};

function createUserListItem(userId, name) {
    const div = document.createElement('div');
    div.id = userId;

    const img = document.createElement('img');
    img.src = './user.png';

    const span = document.createElement('span');
    span.innerHTML = name;

    div.appendChild(img);
    div.appendChild(span);

    return div;
}

function createMessageHTML(message) {
    const text = message.data.text;
    const user = message.sender.state.username;
    const jsTime = parseInt(message.timetoken.substring(0,13));
    const dateString = new Date(jsTime).toLocaleString();

    const div = document.createElement('div');
    const b = document.createElement('b');

    div.id = message.timetoken;
    b.innerHTML = `${user} (${dateString}): `;

    div.appendChild(b);
    div.innerHTML += text;

    return div;
}

// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
// Utility Functions
// =-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=-=
function sendMessage() {
    const messageToSend = messageInput.value.replace(/\r?\n|\r/g, '');
    const trimmed = messageToSend.replace(/(\s)/g, '');

    if (trimmed.length > 0) {
        ChatEngine.global.emit('message', {
            text: messageToSend
        });
    }

    messageInput.value = '';
}

// Makes a new, version 4, universally unique identifier (UUID). Written by
//     Stack Overflow user broofa
//     (https://stackoverflow.com/users/109538/broofa) in this post
//     (https://stackoverflow.com/a/2117523/6193736).
function newUuid() {
    return ([1e7]+-1e3+-4e3+-8e3+-1e11).replace(
        /[018]/g,
        (c) => (c ^ crypto.getRandomValues(new Uint8Array(1))[0] & 15 >> c / 4)
            .toString(16)
    );
}

// Sorts sibling HTML elements based on an attribute value
function sortNodeChildren(parent, attribute) {
    const length = parent.children.length;
    for (let i = 0; i < length-1; i++) {
        if (parent.children[i+1][attribute] < parent.children[i][attribute]) {
            parent.children[i+1].parentNode
                .insertBefore(parent.children[i+1], parent.children[i]);
            i = -1;
        }
    }
}