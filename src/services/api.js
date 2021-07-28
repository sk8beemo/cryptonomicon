/** FIXME убрать в переменную окружения */
const API_KEY =
  "1a8a21127c2da5beaf3d8ac1178a69cec5bd024882ec1446c31022c67ea39456";

const tickersHandlers = new Map();
const socket = new WebSocket(
  `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
);

/** FIXME убрать константы в отдельный файл */
const INVALID_TYPE = "500";
const INVALID_SUB = "INVALID_SUB";
const AGGREGATE_INDEX = "5";

const BTC = "BTC";

let btcCourse;

socket.addEventListener("message", e => {
  const {
    TYPE: type,
    FROMSYMBOL: currency,
    TOSYMBOL: course,
    PRICE: newPrice,
    PARAMETER: parameter,
    MESSAGE: message
  } = JSON.parse(e.data);

  if (type === INVALID_TYPE && message === INVALID_SUB) {
    isBtcCourse(parameter)
      ? unsubscribeFromTickerOnWs(findTokenByParam(parameter), BTC)
      : setBtcCourse(findTokenByParam(parameter));
    return;
  }

  if (type !== AGGREGATE_INDEX || newPrice === undefined) {
    return;
  }

  if (currency === BTC) {
    btcCourse = newPrice;
  }

  const handlers = tickersHandlers.get(currency) ?? [];
  handlers.forEach(fn => {
    if (course === "USD") {
      fn(newPrice);
      return;
    }

    fn(btcToUsd(newPrice));
  });
});

function sendToWebSocket(message) {
  const stringifiedMessage = JSON.stringify(message);
  if (socket.readyState === WebSocket.OPEN) {
    socket.send(stringifiedMessage);
    return;
  }
  socket.addEventListener("open", () => socket.send(stringifiedMessage), {
    once: true
  });
}

/** FIXME добавить типы экшенов и параметры для сабов */
function subscribeToTickerOnWs(ticker, currency) {
  sendToWebSocket({
    action: "SubAdd",
    subs: [`5~CCCAGG~${ticker}~${currency}`]
  });
}

/** FIXME добавить типы экшенов и параметры для сабов */
function unsubscribeFromTickerOnWs(ticker, currency) {
  sendToWebSocket({
    action: "SubRemove",
    subs: [`5~CCCAGG~${ticker}~${currency}`]
  });
}

export const subscribeToTicker = (ticker, cb) => {
  const subscribers = tickersHandlers.get(ticker) || [];
  tickersHandlers.set(ticker, [...subscribers, cb]);
  subscribeToTickerOnWs(ticker, "USD");
};

export const unsubscribeFromTicker = ticker => {
  tickersHandlers.delete(ticker);
  unsubscribeFromTickerOnWs(ticker, "USD");
};

export const getCoins = async () => {
  try {
    const response = await fetch(
      "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
    );
    const { Data } = await response.json();
    return Data;
  } catch (e) {
    alert(e.message);
  }
};

export const initBtcToUsd = () => {
  subscribeToTickerOnWs("BTC", "USD");
};

export const destroyBtcToUsd = () => {
  unsubscribeFromTickerOnWs("BTC", "USD");
};

const findTokenByParam = param => param.split("~")[2];
const isBtcCourse = parameter => parameter.split("~")[3] === "BTC";
const setBtcCourse = coin => {
  unsubscribeFromTickerOnWs(coin, "USD");
  subscribeToTickerOnWs(coin, "BTC");
};
const btcToUsd = price => {
  return btcCourse * price;
};
