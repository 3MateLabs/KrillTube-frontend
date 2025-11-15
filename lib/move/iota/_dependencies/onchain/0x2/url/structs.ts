// @ts-nocheck
import {PhantomReified, Reified, StructClass, ToField, ToTypeStr, decodeFromFields, decodeFromFieldsWithTypes, decodeFromJSONField, phantom} from "../../../../_framework/reified";
import {FieldsWithTypes, composeIotaType, compressIotaType} from "../../../../_framework/util";
import {String} from "../../0x1/ascii/structs";
import {PKG_V5} from "../index";
import {bcs} from "@iota/iota-sdk/bcs";
import {IotaClient, IotaObjectData, IotaParsedData} from "@iota/iota-sdk/client";
import {fromB64} from "@iota/iota-sdk/utils";

/* ============================== Url =============================== */

export function isUrl(type: string): boolean { type = compressIotaType(type); return type === `${PKG_V5}::url::Url`; }

export interface UrlFields { url: ToField<String> }

export type UrlReified = Reified< Url, UrlFields >;

export class Url implements StructClass { __StructClass = true as const;

 static readonly $typeName = `${PKG_V5}::url::Url`; static readonly $numTypeParams = 0; static readonly $isPhantom = [] as const;

 readonly $typeName = Url.$typeName; readonly $fullTypeName: `${typeof PKG_V5}::url::Url`; readonly $typeArgs: []; readonly $isPhantom = Url.$isPhantom;

 readonly url: ToField<String>

 private constructor(typeArgs: [], fields: UrlFields, ) { this.$fullTypeName = composeIotaType( Url.$typeName, ...typeArgs ) as `${typeof PKG_V5}::url::Url`; this.$typeArgs = typeArgs;

 this.url = fields.url; }

 static reified( ): UrlReified { return { typeName: Url.$typeName, fullTypeName: composeIotaType( Url.$typeName, ...[] ) as `${typeof PKG_V5}::url::Url`, typeArgs: [ ] as [], isPhantom: Url.$isPhantom, reifiedTypeArgs: [], fromFields: (fields: Record<string, any>) => Url.fromFields( fields, ), fromFieldsWithTypes: (item: FieldsWithTypes) => Url.fromFieldsWithTypes( item, ), fromBcs: (data: Uint8Array) => Url.fromBcs( data, ), bcs: Url.bcs, fromJSONField: (field: any) => Url.fromJSONField( field, ), fromJSON: (json: Record<string, any>) => Url.fromJSON( json, ), fromIotaParsedData: (content: IotaParsedData) => Url.fromIotaParsedData( content, ), fromIotaObjectData: (content: IotaObjectData) => Url.fromIotaObjectData( content, ), fetch: async (client: IotaClient, id: string) => Url.fetch( client, id, ), new: ( fields: UrlFields, ) => { return new Url( [], fields ) }, kind: "StructClassReified", } }

 static get r() { return Url.reified() }

 static phantom( ): PhantomReified<ToTypeStr<Url>> { return phantom(Url.reified( )); } static get p() { return Url.phantom() }

 static get bcs() { return bcs.struct("Url", {

 url: String.bcs

}) };

 static fromFields( fields: Record<string, any> ): Url { return Url.reified( ).new( { url: decodeFromFields(String.reified(), fields.url) } ) }

 static fromFieldsWithTypes( item: FieldsWithTypes ): Url { if (!isUrl(item.type)) { throw new Error("not a Url type");

 }

 return Url.reified( ).new( { url: decodeFromFieldsWithTypes(String.reified(), item.fields.url) } ) }

 static fromBcs( data: Uint8Array ): Url { return Url.fromFields( Url.bcs.parse(data) ) }

 toJSONField() { return {

 url: this.url,

} }

 toJSON() { return { $typeName: this.$typeName, $typeArgs: this.$typeArgs, ...this.toJSONField() } }

 static fromJSONField( field: any ): Url { return Url.reified( ).new( { url: decodeFromJSONField(String.reified(), field.url) } ) }

 static fromJSON( json: Record<string, any> ): Url { if (json.$typeName !== Url.$typeName) { throw new Error("not a WithTwoGenerics json object") };

 return Url.fromJSONField( json, ) }

 static fromIotaParsedData( content: IotaParsedData ): Url { if (content.dataType !== "moveObject") { throw new Error("not an object"); } if (!isUrl(content.type)) { throw new Error(`object at ${(content.fields as any).id} is not a Url object`); } return Url.fromFieldsWithTypes( content ); }

 static fromIotaObjectData( data: IotaObjectData ): Url { if (data.bcs) { if (data.bcs.dataType !== "moveObject" || !isUrl(data.bcs.type)) { throw new Error(`object at is not a Url object`); }

 return Url.fromBcs( fromB64(data.bcs.bcsBytes) ); } if (data.content) { return Url.fromIotaParsedData( data.content ) } throw new Error( "Both `bcs` and `content` fields are missing from the data. Include `showBcs` or `showContent` in the request." ); }

 static async fetch( client: IotaClient, id: string ): Promise<Url> { const res = await client.getObject({ id, options: { showBcs: true, }, }); if (res.error) { throw new Error(`error fetching Url object at id ${id}: ${res.error.code}`); } if (res.data?.bcs?.dataType !== "moveObject" || !isUrl(res.data.bcs.type)) { throw new Error(`object at id ${id} is not a Url object`); }

 return Url.fromIotaObjectData( res.data ); }

 }
