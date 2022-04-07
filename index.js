const uuid = require('uuid');
const { Server } = require('ws');

const wss = new Server({ port: 19131 });

wss.on('connection', (socket, request) => { // connect wsserverコマンドで接続したとき

  socket.on('message', (rawdata, isBinary) => { // 何らかのデータがマイクラ側から送られてきたとき

    const data = JSON.parse(rawdata);

    switch (data.header.messagePurpose) { // メッセージの種類

      case 'event': // subscribeしたイベントが発生したとき

        switch (data.body.eventName) { // イベント名

          case 'PlayerMessage': //プレイヤーがチャットに発言したとき (このプログラムではsubscribeしてないので動かない)

            if (data.body.properties.Message !== 'close') break;

            console.log('通信終了');

            socket.send(JSON.stringify({
              header: {
                requestId: uuid.v4(),
                messagePurpose: 'commandRequest',
                version: 1
              },
              body: {
                commandLine: 'closewebsocket', // 通信を終了する為のWebSocketサーバー専用のコマンド
                version: 1
              }
            }));

            break;
        }
        break;

      case 'commandResponse': // リクエストしたコマンドが実行されたとき

        if (!commandRequests.has(data.header.requestId)) break; // (Mapオブジェクト).has(キー) でキーの存在チェック

        commandRequests.get(data.header.requestId)(data.body); // getで取得。今回は関数が入っているので引数に実行結果のデータを渡して実行
        commandRequests.delete(data.header.requestId); // もう必要ないのでdeleteで削除

        break;
    }
  });

  const commandRequests = new Map(); // Mapを使うと キー(数値でも文字列でもなんでもいい) ＆ データ をセットで保持できる

  socket.send(JSON.stringify({
    header: {
      requestId: uuid.v4(),
      messagePurpose: 'subscribe',
      version: 1
    },
    body: {
      eventName: 'PlayerMessage' // 使いたいイベント名
    }
  }));

  const requestId = uuid.v4(); // どのコマンドの結果が返ってきたか判別するためのUUID

  commandRequests.set(requestId, (response) => { // set(キー, データ)　で格納。今回は requestId がキーで、結果が返ってきたときに処理する関数

    console.log(response); // コマンドの実行結果の内容

    console.log(`コマンドは正しく実行されま${response.statusCode ? 'せんでした' : 'した'}`); // コマンドが成功したときに0、何らかのエラーがあったり失敗すると0以外の整数になる

    console.log(response.statusMessage); // チャットとかに表示されるメッセージ

    if (response.statusCode) return; // エラーのときは後の処理をスキップ

    console.log(`${response.victim.length}人のプレイヤーがタグ "a" を持っています`); // testfor専用のプロパティ。エンティティ名が配列で格納されている

    response.victim.forEach(name => {
      console.log(`-> ${name}`);
    });


    const requestId = uuid.v4();
    commandRequests.set(requestId, (response) => {
      console.log(response);
      console.log(`コマンドは正しく実行されま${response.statusCode ? 'せんでした' : 'した'}`);
      console.log(response.statusMessage);
      if (response.statusCode) return;
      console.log(`${response.victim.length}人のプレイヤーがタグ "a" を持っていません`);
      response.victim.forEach(name => {
        console.log(`-> ${name}`);
      });
    });
    socket.send(JSON.stringify({
      header: {
        requestId,
        messagePurpose: 'commandRequest',
        version: 1
      },
      body: {
        commandLine: 'testfor @a[tag=!a]',
        version: 1
      }
    }));

  });

  socket.send(JSON.stringify({ // コマンドをリクエスト
    header: {
      requestId, // requestId: requestId, を省略して書ける
      messagePurpose: 'commandRequest',
      version: 1
    },
    body: {
      commandLine: 'testfor @a[tag=a]', // 普通のマイクラのコマンドと専用の特殊なコマンドが少しある
      version: 1
    }
  }));
});

