import * as reified from "../../../../_framework/reified";
import {PhantomReified, Reified, StructClass, ToField, ToTypeStr, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, phantom, ToTypeStr as ToPhantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType} from "../../../../_framework/util";
import {TreasuryCap} from "../coin/structs";
import {PKG_V5} from "../index";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== IOTA =============================== */

export function isIOTA(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::iota::IOTA`; }

export interface IOTAFields { dummyField: ToField<"bool"> }

export type IOTAReified = Reified< IOTA, IOTAFields >;

export class IOTA implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::iota::IOTA`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = IOTA.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::iota::IOTA`; readonly $typeArgs: []; readonly $isPhantom = IOTA.$isPhantom;

 readonly dummyField: ToField<"bool">

 private constructor(typeArgs: [], fields: IOTAFields, ) { this.$fullTypeName = composeIotaType( IOTA.$typeName, ...typeArgs ) as `${typeof PKG_V5}::iota::IOTA`; this.$typeArgs = typeArgs;

 this.dummyField = fields.dummyField; }

 static reified( ): IOTAReified { return { typeName: IOTA.$typeName, fullTypeName: composeIotaType( IOTA.$typeName, ...[] ) as `${typeof PKG_V5}::iota::IOTA`, typeArgs: [ ] as [], isPhantom: IOTA.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => IOTA.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => IOTA.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => IOTA.fromBcs( data, ), bcs: IOTA.bcs, fromJSONField: (field: any) => IOTA.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => IOTA.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => IOTA.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => IOTA.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => IOTA.fetch( client, id, ), new: ( fields: IOTAFields, ) => { return new IOTA( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return IOTA.reified() }

 static phantom( ): PhantomReified<ToTypeStr<IOTA>> { return phantom(IOTA.reified( )); } static get p() { return IOTA.phantom() }

 static get bcs() { return bcs.struct("IOTA", {

 dummy_field: bcs.bool()

}) };

 static fromFields( fields: Record<string, any> ): IOTA { return IOTA.reified( ).new( { dummyField: decodeFromFields("bool", fields.dummy_field) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): IOTA { if (!isIOTA(item.type)) { throw new Error("not a IOTA type");

 }

 return IOTA.reified( ).new( { dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field) } ) }

 static fromBcs( data: Uint8Array ): IOTA { return IOTA.fromFields( IOTA.bcs.parse(data) ) }

 toJSONField() { return {

 dummyField: this.dummyField,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): IOTA { return IOTA.reified( ).new( { dummyField: decodeFromJSONField("bool", field.dummyField) } ) }

 static fromJSON( json: Record<string, any> ): IOTA { if (json.$typeName !== IOTA.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return IOTA.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): IOTA { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isIOTA(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a IOTA object`); } return IOTA.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): IOTA { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isIOTA(data.bcs.type)) { throw new Error(`object at is not a IOTA object`); }

 return IOTA.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return IOTA.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<IOTA> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching IOTA object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isIOTA(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a IOTA object`); }

 return IOTA.fromIotaObjectData( res.data ); }

 }

/* ============================== IotaTreasuryCap =============================== */

export function isIotaTreasuryCap(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::iota::IotaTreasuryCap`; }

export interface IotaTreasuryCapFields { inner: ToField<TreasuryCap<ToPhantom<IOTA>>> }

export type IotaTreasuryCapReified = Reified< IotaTreasuryCap, IotaTreasuryCapFields >;

export class IotaTreasuryCap implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::iota::IotaTreasuryCap`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = IotaTreasuryCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::iota::IotaTreasuryCap`; readonly $typeArgs: []; readonly $isPhantom = IotaTreasuryCap.$isPhantom;

 readonly inner: ToField<TreasuryCap<ToPhantom<IOTA>>>

 private constructor(typeArgs: [], fields: IotaTreasuryCapFields, ) { this.$fullTypeName = composeIotaType( IotaTreasuryCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::iota::IotaTreasuryCap`; this.$typeArgs = typeArgs;

 this.inner = fields.inner; }

 static reified( ): IotaTreasuryCapReified { return { typeName: IotaTreasuryCap.$typeName, fullTypeName: composeIotaType( IotaTreasuryCap.$typeName, ...[] ) as `${typeof PKG_V5}::iota::IotaTreasuryCap`, typeArgs: [ ] as [], isPhantom: IotaTreasuryCap.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => IotaTreasuryCap.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => IotaTreasuryCap.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => IotaTreasuryCap.fromBcs( data, ), bcs: IotaTreasuryCap.bcs, fromJSONField: (field: any) => IotaTreasuryCap.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => IotaTreasuryCap.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => IotaTreasuryCap.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => IotaTreasuryCap.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => IotaTreasuryCap.fetch( client, id, ), new: ( fields: IotaTreasuryCapFields, ) => { return new IotaTreasuryCap( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return IotaTreasuryCap.reified() }

 static phantom( ): PhantomReified<ToTypeStr<IotaTreasuryCap>> { return phantom(IotaTreasuryCap.reified( )); } static get p() { return IotaTreasuryCap.phantom() }

 static get bcs() { return bcs.struct("IotaTreasuryCap", {

 inner: TreasuryCap.bcs

}) };

 static fromFields( fields: Record<string, any> ): IotaTreasuryCap { return IotaTreasuryCap.reified( ).new( { inner: decodeFromFields(TreasuryCap.reified(reified.phantom(IOTA.reified())), fields.inner) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): IotaTreasuryCap { if (!isIotaTreasuryCap(item.type)) { throw new Error("not a IotaTreasuryCap type");

 }

 return IotaTreasuryCap.reified( ).new( { inner: decodeFromFieldsWithTypes(TreasuryCap.reified(reified.phantom(IOTA.reified())), item.fields.inner) } ) }

 static fromBcs( data: Uint8Array ): IotaTreasuryCap { return IotaTreasuryCap.fromFields( IotaTreasuryCap.bcs.parse(data) ) }

 toJSONField() { return {

 inner: this.inner.toJSONField(),

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): IotaTreasuryCap { return IotaTreasuryCap.reified( ).new( { inner: decodeFromJSONField(TreasuryCap.reified(reified.phantom(IOTA.reified())), field.inner) } ) }

 static fromJSON( json: Record<string, any> ): IotaTreasuryCap { if (json.$typeName !== IotaTreasuryCap.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return IotaTreasuryCap.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): IotaTreasuryCap { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isIotaTreasuryCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a IotaTreasuryCap object`); } return IotaTreasuryCap.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): IotaTreasuryCap { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isIotaTreasuryCap(data.bcs.type)) { throw new Error(`object at is not a IotaTreasuryCap object`); }

 return IotaTreasuryCap.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return IotaTreasuryCap.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<IotaTreasuryCap> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching IotaTreasuryCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isIotaTreasuryCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a IotaTreasuryCap object`); }

 return IotaTreasuryCap.fromIotaObjectData( res.data ); }

 }
