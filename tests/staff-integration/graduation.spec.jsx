import {beforeEach,afterEach,expect,it,vi} from 'vitest';
import {act} from 'react';
import {createRoot} from 'react-dom/client';
const f=vi.hoisted(()=>({query:{},save:vi.fn()}));
vi.mock('@/samvaad/components/course-session',()=>({useCourseQuery:()=>f.query,useCurrentCourseAction:()=>()=>true}));
vi.mock('@/lib/api/config',()=>({api:{useMutation:()=>({mutateAsync:f.save,isPending:false})}}));
vi.mock('@/components/ui/button',()=>({Button:props=><button {...props}/> }));
import {GraduationPanel} from '@/samvaad/components/graduation';
globalThis.IS_REACT_ACT_ENVIRONMENT=true;
let root,container;
beforeEach(()=>{f.query={isError:false,isFetching:false,refetch:vi.fn(),data:{record:{version:0,state:'draft',course_verified:false,placement_verified:false},operations:['read','verify_course'],history:[]}};container=document.createElement('div');document.body.append(container);root=createRoot(container);});
afterEach(async()=>{await act(async()=>root.unmount());container.remove();});
async function render(){await act(async()=>root.render(<GraduationPanel courseId="1" studentId="2"/>));}
it('does not offer ungranted administrator operations',async()=>{await render();expect([...container.querySelectorAll('option')].map(x=>x.value)).toEqual(['verify_course']);});
it('blocks approval until both verifications exist',async()=>{f.query.data.operations=['read','approve'];await render();expect([...container.querySelectorAll('button')].find(x=>x.textContent==='Approve graduation').disabled).toBe(true);});
it('approved records offer reopening rather than editable verification',async()=>{f.query.data.record.state='graduated';f.query.data.operations=['read','verify_course','approve','reopen'];await render();expect([...container.querySelectorAll('option')].map(x=>x.value)).toEqual(['reopen']);});
it('hides cached evidence when permissions fail',async()=>{f.query.isError=true;f.query.data.record.course_evidence={reference:'private reference'};await render();expect(container.textContent).not.toContain('private reference');expect(container.querySelector('[role=alert]')).not.toBeNull();});
