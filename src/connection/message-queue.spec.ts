import "mocha";

import { expect, spy } from "chai";
import { Message } from "doso-protocol";

import { Logger, LogLevel } from "../logger";
import { Container } from "../types/container";
import { MessageQueue } from "./message-queue";

function getMessageQueue() {
  const container: Container = Object.create(null);
  container.Config = Object.create(null);
  container.Config.logLevel = LogLevel.Error;
  container.Logger = new Logger(container);
  container.LocalStorage = Object.create(null);
  return new MessageQueue(container);
}

describe("MessageQueue", () => {
  describe("init()", () => {
    it("should call initQueues()", () => {
      const mq = getMessageQueue();
      mq["initQueues"] = spy(() => {});
      mq.init();
      expect(mq["initQueues"]).to.have.been.called;
    });
  });

  describe("initQueues()", () => {
    it("should create paused async queues", () => {
      const mq = getMessageQueue();
      mq["initQueues"]();

      expect(mq["incomingMessagesQueue"]).to.exist;
      expect(mq["incomingMessagesQueue"].paused).to.be.true;

      expect(mq["outgoingMessagesQueue"]).to.exist;
      expect(mq["outgoingMessagesQueue"].paused).to.be.true;
    });
  });

  describe("pause()", () => {
    it("pause() should pause queues", () => {
      const mq = getMessageQueue();
      mq.init();
      mq["outgoingMessagesQueue"].paused = false;
      mq["incomingMessagesQueue"].paused = false;
      mq.pause();
      expect(mq["outgoingMessagesQueue"].paused).to.be.true;
      expect(mq["incomingMessagesQueue"].paused).to.be.true;
    });
  });

  describe("resume()", () => {
    it("resume() should resume queues", () => {
      const mq = getMessageQueue();
      mq.init();
      mq.resume();
      expect(mq["outgoingMessagesQueue"].paused).to.be.false;
      expect(mq["incomingMessagesQueue"].paused).to.be.false;
    });
  });

  it("should queue incoming messages", () => {
    const mq = getMessageQueue();
    mq.init();
    const fnPush = spy(() => "");
    mq["incomingMessagesQueue"].push = fnPush;

    const message: Message = Object.create(null);
    mq.queueIncomingMessage(message);

    expect(fnPush).to.have.been.called.with(message);
  });

  describe("request()", () => {
    it("should increment the request serial", () => {
      const mq = getMessageQueue();
      mq.init();

      const initialSerial = mq["requestSerial"];

      const messagesCount = 5;
      for (let i = 0; i < messagesCount; i++) {
        mq.request(Object.create(null));
      }

      const newSerial = mq["requestSerial"];
      expect(newSerial).to.equal(initialSerial + messagesCount);
    });

    it("should attach the requestId to the message", () => {
      const mq = getMessageQueue();
      mq.init();

      const initialSerial = mq["requestSerial"];
      const messages: { [key: string]: Message } = {};

      const messagesCount = 5;
      for (let i = 0; i < messagesCount; i++) {
        const id = (i + initialSerial).toString();
        const message = Object.create(null) as Message;
        messages[id] = message;
        mq.request(message);
      }

      for (let j = 0; j < messagesCount; j++) {
        const serial = j + initialSerial;
        const message = messages[serial];
        expect(message.requestId).to.equal(serial);
      }
    });

    it("should queue the message", () => {
      const mq = getMessageQueue();
      mq.init();

      const fnPush = spy(() => "");
      mq["outgoingMessagesQueue"].push = fnPush;

      const message: Message = Object.create(null);
      mq.request(message);

      expect(fnPush).to.have.been.called.with(message);
    });

    it("should create a pending request in PromiseBox and return it", () => {
      const mq = getMessageQueue();
      mq.init();

      const fnCreate = spy(async (serial: string) => {});
      mq["pendingRequests"]["create"] = fnCreate;

      const message: Message = Object.create(null);
      const result = mq.request(message);

      expect(fnCreate).to.have.been.called.with(message.requestId.toString());
      expect(result).to.be.instanceOf(Promise);
    });
  });

  describe("processOutgoingMessage()", () => {
    it("should send the message", () => {
      const mq = getMessageQueue();
      mq.init();

      const fnSend = spy(() => {});
      mq["container"].Connection = Object.create(null);
      mq["container"].Connection.getProtocol = () => "test";
      mq["container"].Connection.sendMessage = fnSend;

      const message: Message = Object.create(null);
      message.type = "test";
      message.requestId = 1;
      mq["processOutgoingMessage"](message, () => {});

      expect(fnSend).to.have.been.called.with(message);
    });

    it("should set the timeout on the message", () => {
      const mq = getMessageQueue();
      mq.init();

      const timeout = 9876;
      mq["container"].Config.requestTimeout = timeout;
      const fnSend = spy(() => {});
      const fnSetTimeout = spy(() => {});
      mq["container"].Connection = Object.create(null);
      mq["container"].Connection.getProtocol = () => "test";
      mq["container"].Connection.sendMessage = fnSend;
      mq["pendingRequests"].setTimeout = fnSetTimeout;

      const message: Message = Object.create(null);
      message.type = "test";
      message.requestId = 1;
      mq["processOutgoingMessage"](message, () => {});

      expect(fnSetTimeout).to.have.been.called.with(
        message.requestId.toString(),
        timeout
      );
    });

    it("should call the Async callback at the end", () => {
      const mq = getMessageQueue();
      mq.init();
      const fnSend = spy(() => {});
      const fnSetTimeout = spy(() => {});
      mq["container"].Connection = Object.create(null);
      mq["container"].Connection.getProtocol = () => "test";
      mq["container"].Connection.sendMessage = fnSend;
      mq["pendingRequests"].setTimeout = fnSetTimeout;

      const message: Message = Object.create(null);
      message.type = "test";
      message.requestId = 1;

      const fnCallback = spy(() => {});
      mq["processOutgoingMessage"](message, fnCallback);

      expect(fnCallback).to.have.been.called();
    });

    it("TODO should reject the Promise on failure", () => {});
  });

  describe("processIncomingMessage()", () => {
    it("should resolve the message if it has a requestId", () => {
      const mq = getMessageQueue();
      mq.init();
      mq["container"].Connection = Object.create(null);
      mq["container"].Connection.getProtocol = () => "test";
      mq["pendingRequests"].resolve = () => {};

      const message: Message = Object.create(null);
      message.type = "test";
      message.requestId = 1;

      const fnResolve = spy(() => {});
      mq["pendingRequests"].resolve = fnResolve;
      mq["processIncomingMessage"](message, () => {});

      expect(fnResolve).to.have.been.called.with(
        message.requestId.toString(),
        message
      );
    });

    it("should call the Async callback at the end", () => {
      const mq = getMessageQueue();
      mq.init();
      mq["container"].Connection = Object.create(null);
      mq["container"].Connection.getProtocol = () => "test";
      mq["pendingRequests"].resolve = () => {};

      const message: Message = Object.create(null);
      message.type = "test";
      message.requestId = 1;

      const fnCallback = spy(() => {});
      mq["processIncomingMessage"](message, fnCallback);

      expect(fnCallback).to.have.been.called();
    });
  });
  describe("reset()", () => {
    it("TODO", () => {});
  });
});
