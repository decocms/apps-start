/**
 * VTEX Profile update action (store-graphql).
 * Ported from deco-cx/apps:
 *   - vtex/actions/profile/updateProfile.ts
 * @see https://developers.vtex.com/docs/guides/profile-system
 */
import { vtexFetch, getVtexConfig } from "../client";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface ProfileInput {
  firstName?: string;
  lastName?: string;
  birthDate?: string;
  gender?: string;
  homePhone?: string;
  businessPhone?: string;
  document?: string;
  email: string;
  tradeName?: string;
  corporateName?: string;
  corporateDocument?: string;
  stateRegistration?: string;
  isCorporate?: boolean;
}

export interface Profile {
  cacheId: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  gender: string;
  homePhone: string;
  businessPhone: string;
  document: string;
  email: string;
  tradeName: string;
  corporateName: string;
  corporateDocument: string;
  stateRegistration: string;
  isCorporate: boolean;
}

// ---------------------------------------------------------------------------
// GraphQL helper (myvtex.com private graphql)
// ---------------------------------------------------------------------------

interface GqlResponse<T> {
  data: T;
  errors?: Array<{ message: string }>;
}

async function gql<T>(
  query: string,
  variables: Record<string, unknown>,
  authCookie: string,
): Promise<T> {
  const { account } = getVtexConfig();
  const result = await vtexFetch<GqlResponse<T>>(
    `https://${account}.myvtex.com/_v/private/graphql/v1`,
    {
      method: "POST",
      body: JSON.stringify({ query, variables }),
      headers: { Cookie: `VtexIdclientAutCookie=${authCookie}` },
    },
  );
  if (result.errors?.length) {
    throw new Error(`GraphQL error: ${result.errors[0].message}`);
  }
  return result.data;
}

// ---------------------------------------------------------------------------
// Mutation
// ---------------------------------------------------------------------------

const UPDATE_PROFILE = `mutation UpdateProfile($input: ProfileInput!) {
  updateProfile(fields: $input) @context(provider: "vtex.store-graphql") {
    cacheId
    firstName
    lastName
    birthDate
    gender
    homePhone
    businessPhone
    document
    email
    tradeName
    corporateName
    corporateDocument
    stateRegistration
    isCorporate
  }
}`;

// ---------------------------------------------------------------------------
// Action
// ---------------------------------------------------------------------------

/**
 * Update user profile.
 * The original Deco action extracted `email` from the auth cookie payload.
 * Here the caller must provide it explicitly.
 */
export async function updateProfile(
  fields: Omit<ProfileInput, "email">,
  email: string,
  authCookie: string,
): Promise<Profile> {
  const { updateProfile: profile } = await gql<{ updateProfile: Profile }>(
    UPDATE_PROFILE,
    { input: { ...fields, email } },
    authCookie,
  );
  return profile;
}
