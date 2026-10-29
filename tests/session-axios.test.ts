import { describe, it, expect, vi } from 'vitest';
import axios, { AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { createSessionAxios } from '@/lib/session-axios';
import { ServerSessionClient } from '@/lib/server-session-client';
const setup=()=>{
 const session=new ServerSessionClient('https://api.test/api');
 const identity=vi.spyOn(session,'requestIdentity').mockResolvedValue({principal:'u',csrf:'csrf',revision:1});
 const check=vi.spyOn(session,'assertIdentity').mockImplementation(()=>{});
 const refresh=vi.spyOn(session,'refresh').mockResolvedValue();
 const api=createSessionAxios('https://api.test/api',session);
 const adapter=vi.fn(async(config:InternalAxiosRequestConfig)=>({data:{ok:true},status:200,statusText:'OK',headers:{},config}));api.defaults.adapter=adapter;
 return {api,adapter,identity,check,refresh};
};
describe('explicit cookie Axios transport',()=>{
 it('removes caller bearer and binds expected account',async()=>{const {api,adapter}=setup();await api.get('practice/hub',{headers:{Authorization:'Bearer old'}});const config=adapter.mock.calls[0][0];expect(config.headers.has('Authorization')).toBe(false);expect(config.headers.get('X-Session-Principal')).toBe('u');expect(config.withCredentials).toBe(true);});
 it('adds authoritative CSRF to mutations',async()=>{const {api,adapter}=setup();await api.post('interviews/create',{}, {headers:{'X-CSRF-Token':'stale'}});expect(adapter.mock.calls[0][0].headers.get('X-CSRF-Token')).toBe('csrf');});
 it('removes unnecessary CSRF from reads',async()=>{const {api,adapter}=setup();await api.get('practice/hub',{headers:{'X-CSRF-Token':'stale'}});expect(adapter.mock.calls[0][0].headers.has('X-CSRF-Token')).toBe(false);});
 it.each(['https://evil.test/api/practice/hub','//evil.test/api/practice','../practice/hub','auth/sso/refresh','me','users/login','%61uth/sso/refresh','practice/hub#secret'])('rejects unreviewed destination %s',async path=>{const {api,adapter,identity}=setup();await expect(api.get(path)).rejects.toBeDefined();expect(adapter).not.toHaveBeenCalled();expect(identity).not.toHaveBeenCalled();});
 it('rejects base override',async()=>{const {api,adapter}=setup();await expect(api.get('practice/hub',{baseURL:'https://evil.test'})).rejects.toBeDefined();expect(adapter).not.toHaveBeenCalled();});
 it('does not dispatch cancelled request',async()=>{const {api,adapter}=setup();const c=new AbortController();c.abort();await expect(api.get('practice/hub',{signal:c.signal})).rejects.toSatisfy(axios.isCancel);expect(adapter).not.toHaveBeenCalled();});
 it('checks identity before returning response',async()=>{const {api,check}=setup();await api.get('practice/hub');expect(check).toHaveBeenCalledWith({principal:'u',revision:1});});
 it('refreshes and retries a read once',async()=>{const {api,adapter,refresh}=setup();adapter.mockImplementationOnce(async config=>{throw new AxiosError('expired','ERR_BAD_REQUEST',config,undefined,{data:{},status:401,statusText:'',headers:{},config});});await api.get('practice/hub');expect(refresh).toHaveBeenCalledOnce();expect(adapter).toHaveBeenCalledTimes(2);});
 it.each(['post','put','patch','delete'])('never replays %s after 401',async method=>{const {api,adapter,refresh}=setup();adapter.mockImplementation(async config=>{throw new AxiosError('expired','ERR_BAD_REQUEST',config,undefined,{data:{},status:401,statusText:'',headers:{},config});});await expect(api.request({url:'interviews/create',method})).rejects.toBeDefined();expect(adapter).toHaveBeenCalledOnce();expect(refresh).not.toHaveBeenCalled();});
 it('stops after second read 401',async()=>{const {api,adapter,refresh}=setup();adapter.mockImplementation(async config=>{throw new AxiosError('expired','ERR_BAD_REQUEST',config,undefined,{data:{},status:401,statusText:'',headers:{},config});});await expect(api.get('practice/hub')).rejects.toBeDefined();expect(adapter).toHaveBeenCalledTimes(2);expect(refresh).toHaveBeenCalledOnce();});
});

it.each(['me/resume-storage/' + 'a'.repeat(64), 'me/resume-operations/operation-1', 'me/resume-operations/operation-1/recovery', 'me/resume-operations/operation-1/restore-file'])('supports account-owned resume recovery in session mode: %s',async path=>{
 const {api,adapter}=setup();await api.post(path,{});expect(adapter).toHaveBeenCalledOnce();expect(adapter.mock.calls[0][0].headers.get('X-CSRF-Token')).toBe('csrf');
});

it.each(['v2/graduation/me', 'v2/practice-dashboard/consents/me'])('permits session-owned profile feature %s',async path=>{const {api,adapter}=setup();await api.get(path);expect(adapter).toHaveBeenCalledOnce();expect(adapter.mock.calls[0][0].headers.get('X-Session-Principal')).toBe('u');});
