import {PhantomReified, Reified, StructClass, ToField, ToTypeStr, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType} from "../../../../_framework/util";
import {PKG_V5} from "../index";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== IotaSystemAdminCap =============================== */

export function isIotaSystemAdminCap(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::system_admin_cap::IotaSystemAdminCap`; }

export interface IotaSystemAdminCapFields { dummyField: ToField<"bool"> }

export type IotaSystemAdminCapReified = Reified< IotaSystemAdminCap, IotaSystemAdminCapFields >;

export class IotaSystemAdminCap implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::system_admin_cap::IotaSystemAdminCap`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = IotaSystemAdminCap.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::system_admin_cap::IotaSystemAdminCap`; readonly $typeArgs: []; readonly $isPhantom = IotaSystemAdminCap.$isPhantom;

 readonly dummyField: ToField<"bool">

 private constructor(typeArgs: [], fields: IotaSystemAdminCapFields, ) { this.$fullTypeName = composeIotaType( IotaSystemAdminCap.$typeName, ...typeArgs ) as `${typeof PKG_V5}::system_admin_cap::IotaSystemAdminCap`; this.$typeArgs = typeArgs;

 this.dummyField = fields.dummyField; }

 static reified( ): IotaSystemAdminCapReified { return { typeName: IotaSystemAdminCap.$typeName, fullTypeName: composeIotaType( IotaSystemAdminCap.$typeName, ...[] ) as `${typeof PKG_V5}::system_admin_cap::IotaSystemAdminCap`, typeArgs: [ ] as [], isPhantom: IotaSystemAdminCap.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => IotaSystemAdminCap.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => IotaSystemAdminCap.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => IotaSystemAdminCap.fromBcs( data, ), bcs: IotaSystemAdminCap.bcs, fromJSONField: (field: any) => IotaSystemAdminCap.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => IotaSystemAdminCap.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => IotaSystemAdminCap.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => IotaSystemAdminCap.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => IotaSystemAdminCap.fetch( client, id, ), new: ( fields: IotaSystemAdminCapFields, ) => { return new IotaSystemAdminCap( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return IotaSystemAdminCap.reified() }

 static phantom( ): PhantomReified<ToTypeStr<IotaSystemAdminCap>> { return phantom(IotaSystemAdminCap.reified( )); } static get p() { return IotaSystemAdminCap.phantom() }

 static get bcs() { return bcs.struct("IotaSystemAdminCap", {

 dummy_field: bcs.bool()

}) };

 static fromFields( fields: Record<string, any> ): IotaSystemAdminCap { return IotaSystemAdminCap.reified( ).new( { dummyField: decodeFromFields("bool", fields.dummy_field) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): IotaSystemAdminCap { if (!isIotaSystemAdminCap(item.type)) { throw new Error("not a IotaSystemAdminCap type");

 }

 return IotaSystemAdminCap.reified( ).new( { dummyField: decodeFromFieldsWithTypes("bool", item.fields.dummy_field) } ) }

 static fromBcs( data: Uint8Array ): IotaSystemAdminCap { return IotaSystemAdminCap.fromFields( IotaSystemAdminCap.bcs.parse(data) ) }

 toJSONField() { return {

 dummyField: this.dummyField,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): IotaSystemAdminCap { return IotaSystemAdminCap.reified( ).new( { dummyField: decodeFromJSONField("bool", field.dummyField) } ) }

 static fromJSON( json: Record<string, any> ): IotaSystemAdminCap { if (json.$typeName !== IotaSystemAdminCap.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return IotaSystemAdminCap.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): IotaSystemAdminCap { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isIotaSystemAdminCap(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a IotaSystemAdminCap object`); } return IotaSystemAdminCap.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): IotaSystemAdminCap { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isIotaSystemAdminCap(data.bcs.type)) { throw new Error(`object at is not a IotaSystemAdminCap object`); }

 return IotaSystemAdminCap.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return IotaSystemAdminCap.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<IotaSystemAdminCap> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching IotaSystemAdminCap object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isIotaSystemAdminCap(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a IotaSystemAdminCap object`); }

 return IotaSystemAdminCap.fromIotaObjectData( res.data ); }

 }
