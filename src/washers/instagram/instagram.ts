import { flags } from "@oclif/command";
import { OutputFlags } from "@oclif/parser/lib/parse";
import { IgApiClient } from "instagram-private-api";
import { Log } from "../../core/log";
import { Washer } from "../../core/washers/washer";

export class Instagram {
  static authSettings = {
    username: flags.string({
      required: true,
      description: "Instagram username"
    }),

    password: flags.string({
      required: true,
      description: "Instagram password"
    }),

    code: flags.string({
      description: "the challenge code sent for login"
    })
  };

  private static clients: Record<string, IgApiClient> = {};

  static async auth(
    washer: Washer,
    auth: OutputFlags<typeof Instagram.authSettings>
  ): Promise<IgApiClient> {
    if (Instagram.clients[auth.username]) {
      return Instagram.clients[auth.username];
    }
    const client = new IgApiClient();
    client.state.generateDevice(auth.username);
    try {
      await client.account.login(auth.username, auth.password);
      process.nextTick(async () => await client.simulate.postLoginFlow());
    } catch (IgCheckpointError) {
      await client.challenge.auto(true);
      if (!auth.code) {
        await Log.error(washer, {
          msg:
            "an auth code should have been emailed to you, add that to the washer config"
        });
      } else {
        await client.challenge.sendSecurityCode(auth.code);
      }
    }
    await client.simulate.postLoginFlow();
    Instagram.clients[auth.username] = client;
    return client;
  }
}
