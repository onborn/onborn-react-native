import type { UiIrArtifactDeliveryPort } from "../ports/ui-ir-artifact-delivery";

export class HttpUiIrArtifactDelivery implements UiIrArtifactDeliveryPort {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      apiKey: string;
      fetchImpl?: typeof fetch;
      /**
       * Who is asking. An experiment picks the variant's release per person,
       * and the delivery endpoint has nothing else to hash: without these every
       * request looks like the same anonymous caller, so a running experiment
       * puts all of its traffic on one arm and reports a split that never
       * happened.
       */
      userId?: string;
      sessionId?: string;
      /**
       * Audience facts the host chooses to report. An experiment scoped to a
       * country or a minimum app version can only hold its gate when the
       * request carries them; without them such an experiment assigns no one.
       */
      country?: string;
      appVersion?: string;
    },
  ) {}

  async fetchArtifact(
    input: Parameters<UiIrArtifactDeliveryPort["fetchArtifact"]>[0],
  ): Promise<unknown> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const url = new URL(
      `/runtime/v2/flows/${encodeURIComponent(input.flowId)}/artifact`,
      trailingSlash(this.config.apiBaseUrl),
    );
    url.searchParams.set("target", input.target);
    if (this.config.userId) url.searchParams.set("userId", this.config.userId);
    if (this.config.sessionId) {
      url.searchParams.set("sessionId", this.config.sessionId);
    }
    if (this.config.country) {
      url.searchParams.set("country", this.config.country);
    }
    if (this.config.appVersion) {
      url.searchParams.set("appVersion", this.config.appVersion);
    }
    // This client's schema knows the experiment field, so it always asks for
    // the assignment stamp; servers ignore the flag when nothing is running.
    url.searchParams.set("assignment", "1");
    // And for the document to ride inside the response: one storage round
    // trip fewer on the critical path, same hash verification either way.
    url.searchParams.set("inline", "1");
    const response = await fetchImpl(url.toString(), {
      headers: { Authorization: `Bearer ${this.config.apiKey}` },
    });
    if (!response.ok) {
      throw new Error(`UI IR delivery failed with ${response.status}.`);
    }
    return response.json() as Promise<unknown>;
  }

  async downloadFile(url: string): Promise<Uint8Array> {
    const fetchImpl = this.config.fetchImpl ?? fetch;
    const response = await fetchImpl(url);
    if (!response.ok) {
      throw new Error(`UI IR download failed with ${response.status}.`);
    }
    return new Uint8Array(await response.arrayBuffer());
  }
}

function trailingSlash(value: string): string {
  return value.endsWith("/") ? value : `${value}/`;
}
