import {PhantomReified, PhantomToTypeStr, PhantomTypeArgument, Reified, StructClass, ToField, ToPhantomTypeArgument, ToTypeStr, assertFieldsWithTypesArgsMatch, assertReifiedTypeArgsMatch, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, extractType, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType, parseTypeName} from "../../../../_framework/util";
import {PKG_V5} from "../index";
import {UID} from "../object/structs";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== Table =============================== */

export function isTable(type: string): boolean { type = compressIotaType(type); return type.startsWith(`${PKG_V5}::table::Table` + '<'); }

export interface TableFields<T0 extends PhantomTypeArgument, T1 extends PhantomTypeArgument> { id: ToField<UID>; size: ToField<"u64"> }

export type TableReified<T0 extends PhantomTypeArgument, T1 extends PhantomTypeArgument> = Reified< Table<T0, T1>, TableFields<T0, T1> >;

export class Table<T0 extends PhantomTypeArgument, T1 extends PhantomTypeArgument> implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::table::Table`; static readonly $numTypeParams = 2; static readonly $isPhantom = [true,true,] as const;

 readonly $typeName = Table.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::table::Table<${PhantomToTypeStr<T0>}, ${PhantomToTypeStr<T1>}>`; readonly $typeArgs: [PhantomToTypeStr<T0>, PhantomToTypeStr<T1>]; readonly $isPhantom = Table.$isPhantom;

 readonly id: ToField<UID>; readonly size: ToField<"u64">

 private constructor(typeArgs: [PhantomToTypeStr<T0>, PhantomToTypeStr<T1>], fields: TableFields<T0, T1>, ) { this.$fullTypeName = composeIotaType( Table.$typeName, ...typeArgs ) as `${typeof PKG_V5}::table::Table<${PhantomToTypeStr<T0>}, ${PhantomToTypeStr<T1>}>`; this.$typeArgs = typeArgs;

 this.id = fields.id;; this.size = fields.size; }

 static reified<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( T0: T0, T1: T1 ): TableReified<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { return { typeName: Table.$typeName, fullTypeName: composeIotaType( Table.$typeName, ...[extractType(T0), extractType(T1)] ) as `${typeof PKG_V5}::table::Table<${PhantomToTypeStr<ToPhantomTypeArgument<T0>>}, ${PhantomToTypeStr<ToPhantomTypeArgument<T1>>}>`, typeArgs: [ extractType(T0), extractType(T1) ] as [PhantomToTypeStr<ToPhantomTypeArgument<T0>>, PhantomToTypeStr<ToPhantomTypeArgument<T1>>], isPhantom: Table.$isPhantom, reifiedTypeArgs: [T0, T1], fromFields: (fields: Record<string, any>) => Table.fromFields( [T0, T1], fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Table.fromFieldsWithTypes( [T0, T1], item, ), fromBcs: (data: Uint8Array) => Table.fromBcs( [T0, T1], data, ), bcs: Table.bcs, fromJSONField: (field: any) => Table.fromJSONField( [T0, T1], field, ), fromJSON: (json: Record<string, any>) => Table.fromJSON( [T0, T1], json, ), fromIotaParsedData: (content: IotaParsedData) => Table.fromIotaParsedData( [T0, T1], content, ), fromIotaObjectData: (content: IotaObjectData) => Table.fromIotaObjectData( [T0, T1], content, ), fetch: async (client: IotaClient, id: string) => Table.fetch( client, [T0, T1], id, ), new: ( fields: TableFields<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>>, ) => { return new Table( [extractType(T0), extractType(T1)], fields ) }, kind: "StructClassReified", } }

 static get r() { return Table.reified }

 static phantom<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( T0: T0, T1: T1 ): PhantomReified<ToTypeStr<Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>>>> { return phantom(Table.reified( T0, T1 )); } static get p() { return Table.phantom }

 static get bcs() { return bcs.struct("Table", {

 id: UID.bcs, size: bcs.u64()

}) };

 static fromFields<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], fields: Record<string, any> ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { return Table.reified( typeArgs[0], typeArgs[1], ).new( { id: decodeFromFields(UID.reified(), fields.id), size: decodeFromFields("u64", fields.size) } ) }

 static fromFieldsWithTypes<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], item: FieldsWithTypes ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { if (!isTable(item.type)) { throw new Error("not a Table type");

 } assertFieldsWithTypesArgsMatch(item, typeArgs);

 return Table.reified( typeArgs[0], typeArgs[1], ).new( { id: decodeFromFieldsWithTypes(UID.reified(), item.fields.id), size: decodeFromFieldsWithTypes("u64", item.fields.size) } ) }

 static fromBcs<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], data: Uint8Array ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { return Table.fromFields( typeArgs, Table.bcs.parse(data) ) }

 toJSONField() { return {

 id: this.id,size: this.size.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], field: any ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { return Table.reified( typeArgs[0], typeArgs[1], ).new( { id: decodeFromJSONField(UID.reified(), field.id), size: decodeFromJSONField("u64", field.size) } ) }

 static fromJSON<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], json: Record<string, any> ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { if (json.$typeName !== Table.$typeName) { throw new Error("not a WithTwoGenerics json object") }; assertReifiedTypeArgsMatch( composeIotaType(Table.$typeName, ...typeArgs.map(extractType)), json.$typeArgs, typeArgs, )

 return Table.fromJSONField( typeArgs, json, ) }

 static fromIotaParsedData<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], content: IotaParsedData ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isTable(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Table object`); } return Table.fromFieldsWithTypes( typeArgs, content ); }

 static fromIotaObjectData<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( typeArgs: [T0, T1], data: IotaObjectData ): Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>> { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isTable(data.bcs.type)) { throw new Error(`object at is not a Table object`); }

 const gotTypeArgs = parseTypeName(data.bcs.type).typeArgs; if (gotTypeArgs.length !== 2) { throw new Error(`type argument mismatch: expected 2 type arguments but got ${gotTypeArgs.length}`); }; for (let i = 0; i < 2; i++) { const gotTypeArg = compressIotaType(gotTypeArgs[i]); const expectedTypeArg = compressIotaType(extractType(typeArgs[i])); if (gotTypeArg !== expectedTypeArg) { throw new Error(`type argument mismatch at position ${i}: expected '${expectedTypeArg}' but got '${gotTypeArg}'`); } };

 return Table.fromBcs( typeArgs, fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Table.fromIotaParsedData( typeArgs, data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch<T0 extends PhantomReified<PhantomTypeArgument>, T1 extends PhantomReified<PhantomTypeArgument>>( client: IotaClient, typeArgs: [T0, T1], id: string ): Promise<Table<ToPhantomTypeArgument<T0>, ToPhantomTypeArgument<T1>>> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Table object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isTable(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Table object`); }

 return Table.fromIotaObjectData( typeArgs, res.data ); }

 }
