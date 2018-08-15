import fetchToJson from '../api/helpers/fetchToJson'
import { SC } from '../utils'
import {
    actionTypes,
    OBJECT_TYPES,
    PLAYLISTS,
    SEARCH_PLAYLISTS_SUFFIX,
    SEARCH_SUFFIX,
    SEARCH_TRACKS_SUFFIX, SEARCH_USERS_SUFFIX
} from '../constants'
import { playlistSchema, trackSchema, userSchema } from '../schemas'
import { normalize, schema } from 'normalizr'


export function search(object_id, query, limit, offset) {
    return (dispatch, getState) => {
        const { objects } = getState()

        const playlist_objects = objects[OBJECT_TYPES.PLAYLISTS] || {}
        const tracklist_object = playlist_objects[object_id]

        if (!query) {
            dispatch({
                type: actionTypes.OBJECT_UNSET,
                payload: {
                    object_id,
                    object_type: OBJECT_TYPES.PLAYLISTS
                }
            })

            return Promise.all()
        }

        let url


        if(object_id.endsWith(SEARCH_TRACKS_SUFFIX)){
            url = SC.searchTracksUrl(query, limit, offset)
        } else if(object_id.endsWith(SEARCH_PLAYLISTS_SUFFIX)){
            url = SC.searchPlaylistsUrl(query, limit, offset)
        } else if(object_id.endsWith(SEARCH_USERS_SUFFIX)){
            url = SC.searchUsersUrl(query, limit, offset)
        }

        if (!tracklist_object || (tracklist_object && !tracklist_object.isFetching && tracklist_object.nextUrl)) {
            return dispatch({
                type: actionTypes.OBJECT_SET,
                payload: {
                    promise: fetchToJson(url)
                        .then(json => {
                            return {
                                normalized: normalize(json.collection, new schema.Array({
                                    playlists: playlistSchema,
                                    tracks: trackSchema,
                                    users: userSchema
                                }, (input, parent, key) => `${input.kind}s`)),
                                json
                            }
                        })
                        .then(({ normalized, json }) => {
                            return {
                                object_id,
                                object_type: OBJECT_TYPES.PLAYLISTS,
                                entities: normalized.entities,
                                result: normalized.result,
                                nextUrl: SC.appendToken(json.next_href),
                                refresh: true
                            }
                        }),
                    data: {
                        object_id,
                        object_type: OBJECT_TYPES.PLAYLISTS
                    }
                }
            })
        }

        return Promise.resolve()

    }
}

export function searchAll(query, limit, offset) {
    return (dispatch, getState) => {
        const { objects } = getState()

        const playlist_objects = objects[OBJECT_TYPES.PLAYLISTS] || {}
        const object_id =  query + SEARCH_SUFFIX;
        const tracklist_object = playlist_objects[object_id]

        if (!query) {
            dispatch({
                type: actionTypes.OBJECT_UNSET,
                payload: {
                    object_id,
                    object_type: OBJECT_TYPES.PLAYLISTS
                }
            })

            return Promise.all()
        }


        if (!tracklist_object || (tracklist_object && !tracklist_object.isFetching && tracklist_object.nextUrl)) {
            return dispatch({
                type: actionTypes.OBJECT_SET,
                payload: {
                    promise: fetchToJson(SC.searchAllUrl(query, limit, offset))
                        .then(json => {
                            return {
                                normalized: normalize(json.collection, new schema.Array({
                                    playlists: playlistSchema,
                                    tracks: trackSchema,
                                    users: userSchema
                                }, (input, parent, key) => `${input.kind}s`)),
                                json
                            }
                        })
                        .then(({ normalized, json }) => {
                            return {
                                object_id,
                                object_type: OBJECT_TYPES.PLAYLISTS,
                                entities: normalized.entities,
                                result: normalized.result,
                                nextUrl: SC.appendToken(json.next_href),
                                refresh: true
                            }
                        }),
                    data: {
                        object_id,
                        object_type: OBJECT_TYPES.PLAYLISTS
                    }
                }
            })
        }

        return Promise.resolve()

    }
}