// @ts-nocheck
import {PhantomReified, Reified, StructClass, ToField, ToTypeStr, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType} from "../../../../_framework/util";
import {PKG_V3} from "../index";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== UQ64_64 =============================== */

export function isUQ64_64(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V3}::uq64_64::UQ64_64`; }

export interface UQ64_64Fields { pos0: ToField<"u128"> }

export type UQ64_64Reified = Reified< UQ64_64, UQ64_64Fields >;

export class UQ64_64 implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V3}::uq64_64::UQ64_64`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = UQ64_64.$typeName; readonly $fullTypeName: `${typeof PKG_V3}::uq64_64::UQ64_64`; readonly $typeArgs: []; readonly $isPhantom = UQ64_64.$isPhantom;

 readonly pos0: ToField<"u128">

 private constructor(typeArgs: [], fields: UQ64_64Fields, ) { this.$fullTypeName = composeIotaType( UQ64_64.$typeName, ...typeArgs ) as `${typeof PKG_V3}::uq64_64::UQ64_64`; this.$typeArgs = typeArgs;

 this.pos0 = fields.pos0; }

 static reified( ): UQ64_64Reified { return { typeName: UQ64_64.$typeName, fullTypeName: composeIotaType( UQ64_64.$typeName, ...[] ) as `${typeof PKG_V3}::uq64_64::UQ64_64`, typeArgs: [ ] as [], isPhantom: UQ64_64.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => UQ64_64.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => UQ64_64.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => UQ64_64.fromBcs( data, ), bcs: UQ64_64.bcs, fromJSONField: (field: any) => UQ64_64.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => UQ64_64.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => UQ64_64.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => UQ64_64.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => UQ64_64.fetch( client, id, ), new: ( fields: UQ64_64Fields, ) => { return new UQ64_64( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return UQ64_64.reified() }

 static phantom( ): PhantomReified<ToTypeStr<UQ64_64>> { return phantom(UQ64_64.reified( )); } static get p() { return UQ64_64.phantom() }

 static get bcs() { return bcs.struct("UQ64_64", {

 pos0: bcs.u128()

}) };

 static fromFields( fields: Record<string, any> ): UQ64_64 { return UQ64_64.reified( ).new( { pos0: decodeFromFields("u128", fields.pos0) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): UQ64_64 { if (!isUQ64_64(item.type)) { throw new Error("not a UQ64_64 type");

 }

 return UQ64_64.reified( ).new( { pos0: decodeFromFieldsWithTypes("u128", item.fields.pos0) } ) }

 static fromBcs( data: Uint8Array ): UQ64_64 { return UQ64_64.fromFields( UQ64_64.bcs.parse(data) ) }

 toJSONField() { return {

 pos0: this.pos0.toString(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): UQ64_64 { return UQ64_64.reified( ).new( { pos0: decodeFromJSONField("u128", field.pos0) } ) }

 static fromJSON( json: Record<string, any> ): UQ64_64 { if (json.$typeName !== UQ64_64.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return UQ64_64.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): UQ64_64 { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isUQ64_64(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a UQ64_64 object`); } return UQ64_64.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): UQ64_64 { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isUQ64_64(data.bcs.type)) { throw new Error(`object at is not a UQ64_64 object`); }

 return UQ64_64.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return UQ64_64.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<UQ64_64> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching UQ64_64 object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isUQ64_64(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a UQ64_64 object`); }

 return UQ64_64.fromIotaObjectData( res.data ); }

 }
