import type { UiIrArtifactDeliveryPort } from "../ports/ui-ir-artifact-delivery";

export class HttpUiIrArtifactDelivery implements UiIrArtifactDeliveryPort {
  constructor(
    private readonly config: {
      apiBaseUrl: string;
      apiKey: string;
      fetchImpl?: typeof fetch;
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
