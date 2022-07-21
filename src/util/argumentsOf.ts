import { ApplicationCommandOptionType } from 'discord-api-types/v10';

export type Command = Readonly<{
	name: string;
	description: string;
	options?: readonly Option[];
}>;

type Option = Readonly<
	{
		name: string;
		description: string;
		required?: boolean;
	} & (
		| {
				type: ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup;
				options?: readonly Option[];
		  }
		| {
				type: ApplicationCommandOptionType.String;
				choices?: readonly Readonly<{ name: string; value: string }>[];
		  }
		| {
				type: ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number;
				choices?: readonly Readonly<{ name: string; value: number }>[];
		  }
		| {
				type:
					| ApplicationCommandOptionType.Boolean
					| ApplicationCommandOptionType.User
					| ApplicationCommandOptionType.Channel
					| ApplicationCommandOptionType.Role
					| ApplicationCommandOptionType.Mentionable
					| ApplicationCommandOptionType.Attachment;
		  }
	)
>;

type UnionToIntersection<U> = (U extends any ? (k: U) => void : never) extends (k: infer I) => void ? I : never;

type TypeIdToType<T, O, C> = T extends ApplicationCommandOptionType.Subcommand
	? ArgumentsOfRaw<O>
	: T extends ApplicationCommandOptionType.SubcommandGroup
	? ArgumentsOfRaw<O>
	: T extends ApplicationCommandOptionType.String
	? C extends readonly { value: string }[]
		? C[number]['value']
		: string
	: T extends ApplicationCommandOptionType.Integer | ApplicationCommandOptionType.Number
	? C extends readonly { value: number }[]
		? C[number]['value']
		: number
	: T extends ApplicationCommandOptionType.Boolean
	? boolean
	: T extends ApplicationCommandOptionType.User
	? string
	: T extends ApplicationCommandOptionType.Channel
	? string
	: T extends ApplicationCommandOptionType.Role
	? string
	: T extends ApplicationCommandOptionType.Mentionable
	? string
	: never;

// eslint-disable-next-line @typescript-eslint/no-unused-vars
type OptionToObject<O> = O extends {
	name: infer K;
	type: infer T;
	required?: infer R;
	options?: infer O;
	choices?: infer C;
}
	? K extends string
		? R extends true
			? { [k in K]: TypeIdToType<T, O, C> }
			: T extends ApplicationCommandOptionType.Subcommand | ApplicationCommandOptionType.SubcommandGroup
			? { [k in K]: TypeIdToType<T, O, C> }
			: { [k in K]?: TypeIdToType<T, O, C> }
		: never
	: never;

type ArgumentsOfRaw<O> = O extends readonly any[] ? UnionToIntersection<OptionToObject<O[number]>> : never;

export type ArgumentsOf<C extends Command> = C extends { options: readonly Option[] }
	? UnionToIntersection<OptionToObject<C['options'][number]>>
	: unknown;
