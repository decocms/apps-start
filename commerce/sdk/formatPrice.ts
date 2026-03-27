const formatters = new Map<string, Intl.NumberFormat>();

const formatter = (currency: string, locale: string) => {
	const key = `${currency}::${locale}`;

	if (!formatters.has(key)) {
		formatters.set(
			key,
			new Intl.NumberFormat(locale, {
				style: "currency",
				currency,
			}),
		);
	}

	return formatters.get(key)!;
};

export const formatPrice = (
	price: number | undefined | null,
	currency = "BRL",
	locale = "pt-BR",
) =>
	price != null && Number.isFinite(price)
		? formatter(currency, locale).format(price)
		: null;
