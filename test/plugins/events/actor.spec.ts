import "mocha";

import { expect } from "chai";

import { onActorCreate } from "../../../src/plugins/events/actor";
import Actor from "../../../src/types/actor";
import { cleanupPluginsConfig, initPluginsConfig } from "../initPluginFixtures";

const actorPluginFixture = require("../fixtures/actor_plugin.fixture");

describe("plugins", () => {
  before(async () => {
    await initPluginsConfig();
  });

  after(async () => {
    await cleanupPluginsConfig();
  });

  describe("events", () => {
    describe("actor", () => {
      ["actorCreated", "actorCustom"].forEach((event: string) => {
        it(`event '${event}': runs fixture plugin, changes properties`, async () => {
          const initialName = "initial actor name";
          const initialAliases = [];
          let actor = new Actor(initialName, initialAliases);

          expect(actor.name).to.equal(initialName);
          expect(actor.aliases).to.deep.equal(initialAliases);

          expect(actor.name).to.not.equal(actorPluginFixture.result.name);
          expect(actor.bornOn).to.not.equal(actorPluginFixture.result.bornOn);
          expect(actor.aliases).to.not.deep.equal(actorPluginFixture.result.aliases);
          expect(actor.rating).to.not.equal(actorPluginFixture.result.rating);
          expect(actor.favorite).to.not.equal(actorPluginFixture.result.favorite);
          expect(actor.bookmark).to.not.equal(actorPluginFixture.result.bookmark);
          expect(actor.nationality).to.not.equal(actorPluginFixture.result.nationality);

          actor = await onActorCreate(actor, [], event);

          expect(actor.name).to.equal(actorPluginFixture.result.name);
          expect(actor.bornOn).to.equal(actorPluginFixture.result.bornOn);
          expect(actor.aliases).to.deep.equal(actorPluginFixture.result.aliases);
          expect(actor.rating).to.equal(actorPluginFixture.result.rating);
          expect(actor.favorite).to.equal(actorPluginFixture.result.favorite);
          expect(actor.bookmark).to.equal(actorPluginFixture.result.bookmark);
          expect(actor.nationality).to.equal(actorPluginFixture.result.nationality);
        });
      });
    });
  });
});
