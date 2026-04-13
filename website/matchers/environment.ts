/**
 * @title {{{environment}}}
 */
export interface Props {
	environment: "production" | "development";
}

/**
 * @title Environment
 * @description Target users based from where they are accessing your site (development, testing, or production)
 * @icon code
 */
const MatchEnvironment = ({ environment }: Props) => {
	const isProduction = process.env.NODE_ENV === "production";

	return environment === "production" ? isProduction : !isProduction;
};

export default MatchEnvironment;

export const cacheable = true;
