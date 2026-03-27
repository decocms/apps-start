export { configureResend, getResendConfig } from "./client";
export { sendEmail } from "./actions/send";
export type {
	CreateEmailOptions,
	CreateEmailResponse,
	CreateEmailResponseSuccess,
	ErrorResponse,
	ResendConfig,
	ResendErrorCodeKey,
} from "./types";
