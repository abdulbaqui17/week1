import WebSocket from "ws";

const ws = new WebSocket("wss://stream.binance.com:9443/ws/solusdt@trade");

ws.on("message", (rawData) => {
    //@ts-ignore
  const data = JSON.parse(rawData);

  console.log("Sol Price "+ data.q );
  console.log("Symbol: " +data.s);
  console.log("Price: "+data.p);
  console.log("Quantity: "+data.q);
});
