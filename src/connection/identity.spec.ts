import "mocha";

import { expect, spy } from "chai";

import { Container } from "../types/container";
import { Identity } from "./identity";

const fingerprint = "abc123";

function getContainer() {
  const container: Container = Object.create(null);
  container.LocalStorage = Object.create(null);
  container.fingerprint = fingerprint;
  return container;
}

describe("Identity", () => {
  it("should get id and secret on instantiation", () => {
    const container = getContainer();

    const fnGet = spy(() => "");
    container.LocalStorage.get = fnGet;
    const identity = new Identity(container);
    const idKey = identity["getLSKey"](identity["KEY_IDENTITY_ID"]);
    const secretKey = identity["getLSKey"](identity["KEY_IDENTITY_SECRET"]);
    expect(fnGet).to.have.been.called.with(idKey);
    expect(fnGet).to.have.been.called.with(secretKey);
  });

  it("should return id via getId()", () => {
    const container = getContainer();

    const originalId = "__id__";
    const fnGet = spy((key: string) => {
      return `${key}_${originalId}`;
    });
    container.LocalStorage.get = fnGet;
    const identity = new Identity(container);

    const testId = identity["getLSKey"](identity["KEY_IDENTITY_ID"]);
    const resultId = identity.getId();
    expect(resultId).to.equal(`${testId}_${originalId}`);
  });

  it("should return secret via getSecret()", () => {
    const container = getContainer();

    const originalSecret = "__secret__";
    const fnGet = spy((key: string) => {
      return `${key}_${originalSecret}`;
    });
    container.LocalStorage.get = fnGet;
    const identity = new Identity(container);

    const testId = identity["getLSKey"](identity["KEY_IDENTITY_SECRET"]);
    const resultId = identity.getSecret();
    expect(resultId).to.equal(`${testId}_${originalSecret}`);
  });

  it("should set id and secret", () => {
    const container = getContainer();

    const fnSet = spy(() => true);
    const fnGet = spy(() => "");
    container.LocalStorage.set = fnSet;
    container.LocalStorage.get = fnGet;

    const identity = new Identity(container);

    const idKey = identity["getLSKey"](identity["KEY_IDENTITY_ID"]);
    const secretKey = identity["getLSKey"](identity["KEY_IDENTITY_SECRET"]);

    const id = "__identityId__";
    const secret = "__secret__";

    identity.setIdAndSecret(id, secret);

    expect(fnSet).to.have.been.called.with(idKey, id);
    expect(fnGet).to.have.been.called.with(idKey);
    expect(fnSet).to.have.been.called.with(idKey, id);
    expect(fnSet).to.have.been.called.with(secretKey, secret);
  });
});
