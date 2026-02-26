export function gql(
  strings: TemplateStringsArray,
  ...values: unknown[]
): string {
  return strings.reduce(
    (acc, str, i) => acc + str + (values[i] ?? ""),
    ""
  );
}

export interface GraphQLClient {
  query<T>(
    query: string,
    variables?: Record<string, unknown>
  ): Promise<T>;
}

export function createGraphqlClient(
  endpoint: string,
  headers: Record<string, string>
): GraphQLClient {
  return {
    async query<T>(
      query: string,
      variables?: Record<string, unknown>
    ): Promise<T> {
      const response = await fetch(endpoint, {
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
