import * as Async from "async";
import chalk from "chalk";
import { Message } from "doso-protocol";
import { PromiseBox } from "promise-box";

import { interfaces } from "../types/interfaces";

export class MessageQueue implements interfaces.MessageQueue {
  /**
   * Registry of pending requests.
   */
  private pendingRequests: PromiseBox;

  /**
   * Every outgoing request has its own serial number.
   * This variable retains the latest one of it.
   */
  private requestSerial = 1;

  /**
   * Unprocessed outgoing Messages which may only be sent once
   * this.state === ConnectionState.Ready.
   */
  private outgoingMessagesQueue: Async.AsyncQueue<Message>;

  /**
   * Unprocessed incoming Messages.
   */
  private incomingMessagesQueue: Async.AsyncQueue<Message>;

  /**
   * Async queue worker for incoming messages.
   */
  private async processIncomingMessage(message: Message, callback: () => void) {
    try {
      this.container.Logger.info(() => [
        chalk.yellow("<-"),
        this.container.Connection.getProtocol(),
        message.type
      ]);
      if (message.requestId) {
        // Receive response
        this.pendingRequests.resolve(message.requestId.toString(), message);
      } else {
        // TODO receive event
      }
    } catch (err) {
      this.container.Logger.error(err);
    } finally {
      // Finally get to the next item in the queue
      callback();
    }
  }

  /**
   * Async queue worker for outgoing messages.
   */
  private async processOutgoingMessage(message: Message, callback: () => void) {
    try {
      this.container.Logger.info(() => [
        chalk.blue("->"),
        this.container.Connection.getProtocol(),
        message.type
      ]);

      // Send the message to the Server.
      this.container.Connection.sendMessage(message);

      // Then start the clock ticking, waiting for the response.
      const timeout = this.container.Config.requestTimeout || 10000;
      this.pendingRequests.setTimeout(message.requestId.toString(), timeout);
    } catch (err) {
      this.container.Logger.error("Error sending message", err);
      this.pendingRequests.reject(message.requestId.toString(), err);
    } finally {
      callback();
    }
  }

  private initQueues() {
    (this.incomingMessagesQueue = Async.queue(
      this.processIncomingMessage.bind(this),
      1
    )),
      this.incomingMessagesQueue.pause();

    (this.outgoingMessagesQueue = Async.queue(
      this.processOutgoingMessage.bind(this),
      1
    )),
      this.outgoingMessagesQueue.pause();

    // If the connection is not live yet, pause outgoing queues.
    // TODO do this as the first step of a job?
    // if (!this.container.Connection.isConnected()) {
    //   this.outgoingMessagesQueue.pause();
    //   this.incomingMessagesQueue.pause();
    // }
  }

  /**
   * MessageQueue Constructor.
   * @param container
   */
  constructor(private container: interfaces.Container) {
    this.pendingRequests = new PromiseBox();
  }

  init() {
    this.initQueues();
  }

  /**
   * Dispatch `request` to the Server and return a response to it
   * as a Promise.
   * @param message
   * @param timeout
   */
  async request(message: Message, timeout: number = 10): Promise<Message> {
    const requestId = this.requestSerial++;
    const requestIdString = requestId.toString();
    message.requestId = requestId;

    // register Pending request
    const result = this.pendingRequests.create(requestIdString);

    // Queue request to be sent once the connection is ready for it.
    this.outgoingMessagesQueue.push(message);

    // and return the pending request as a Promise
    return result;
  }

  /**
   * Reset the state of this. Drain all tubes and reject all pending requests.
   */
  reset() {
    // TODO
    this.container.Logger.debug("MessageQueue.reset()");
    // this.incomingMessagesQueue.kill();
    // this.outgoingMessagesQueue.kill();
    // this.initQueues();
    // this.resume();
    // this.pendingRequests.rejectAll(); // this doesn't invalidate the timer?
    // this.outgoingMessagesQueue.pause();
  }

  /**
   * Resume queues.
   */
  pause() {
    this.container.Logger.debug("MessageQueue.pause()");
    this.incomingMessagesQueue.paused = true;
    this.outgoingMessagesQueue.paused = true;
  }

  /**
   * Resume queues.
   */
  resume() {
    // if (!this.container.Connection.isConnected()) return;
    this.container.Logger.debug("MessageQueue.resume()");
    this.incomingMessagesQueue.resume();
    this.outgoingMessagesQueue.resume();
  }

  /**
   * Queue `message` to be processed as an incoming Message.
   * @param message
   */
  queueIncomingMessage(message: Message) {
    this.incomingMessagesQueue.push(message);
  }
}
