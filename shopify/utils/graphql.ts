export function gql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    ""
  );
}

export interface QueryDefinition {
  fragments?: string[];
  query: string;
}

export function buildQuery(def: QueryDefinition): string {
  const fragments = def.fragments?.join("\n") ?? "";
  return fragments ? `${fragments}\n${def.query}` : def.query;
}

export interface GraphQLClient {
  query<T>(
    query: string | QueryDefinition,
    variables?: Record<string, unknown>
  ): Promise<T>;
}

export function createGraphqlClient(
  endpoint: string,
  headers: Record<string, string>,
  fetchFn?: typeof fetch,
): GraphQLClient {
  const _fetch = fetchFn ?? globalThis.fetch;
  return {
    async query<T>(
      queryOrDef: string | QueryDefinition,
      variables?: Record<string, unknown>
    ): Promise<T> {
      const query = typeof queryOrDef === "string"
        ? queryOrDef
        : buildQuery(queryOrDef);

      const response = await _fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...headers,
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        throw new Error(
          `Shopify GraphQL error: ${response.status} ${response.statusText}`
        );
      }

      const json = await response.json() as { data?: T; errors?: Array<{ message: string }> };

      if (json.errors?.length) {
        throw new Error(
          `Shopify GraphQL errors: ${json.errors.map((e) => e.message).join(", ")}`
        );
      }

      return json.data as T;
    },
  };
}
