import sys, json, hashlib, platform
from pathlib import Path
repo=Path(__file__).resolve().parents[1]
sys.path.insert(0,str(repo/'backend'))
from app.services.dataset_service import load_dataset_from_path, validate_academic_dataset
from app.services.graph_builder import build_compiled_model
from app.services.calendar_evaluator import evaluate_calendar,get_initial_assignment,build_reschedule_explanations
from app.optimization.random_restarts import solve_with_random_restarts
from app.services.conflict_calculator import compute_objective_function
import numpy,networkx,pydantic
p=repo/'DB/simulacion_academica.json'
(repo/'DB/results').mkdir(parents=True,exist_ok=True)
d=load_dataset_from_path(p)
_, validation=validate_academic_dataset(d.model_dump())
assert validation.valid, validation.issues
assert hashlib.sha256(p.read_bytes()).hexdigest() == 'b622abac4808df28fca6bfe2ba655bed5267a83a509e4bf86b3217a04aab2b6d', 'El conjunto cambió respecto al informe'
m=build_compiled_model(d)
before=get_initial_assignment(m)
r=solve_with_random_restarts(m,restarts=15,seed=42)
again=solve_with_random_restarts(m,restarts=15,seed=42)
assert r.summary.assignment==again.summary.assignment
a=evaluate_calendar(m,before); b=evaluate_calendar(m,r.summary.assignment)
assert a.feasibility.is_feasible and b.feasibility.is_feasible
from datetime import date
from itertools import combinations
def independent_cost(assignment):
    total=0.0
    for x,y in combinations(d.exams,2):
        shared=sum(any(e.group_id==x.group_id for e in s.enrollments) and any(e.group_id==y.group_id for e in s.enrollments) for s in d.students)
        def weight(e):
            subject=next(s for s in d.subjects if s.id==e.subject_id)
            return subject.credits*e.evaluation_percentage*(1+subject.historical_withdrawal_rate/2)
        def day(e):return date.fromisoformat(next(s.date for s in e.authorized_slots if s.slot_id==assignment[e.id]))
        total+=shared*(weight(x)+weight(y))/2*max(0,4-abs((day(x)-day(y)).days))
    return total
assert abs(independent_cost(before)-a.total_objective_f)<0.0001
assert abs(independent_cost(r.summary.assignment)-b.total_objective_f)<0.0001
assert abs(b.total_objective_f-571.0577)<0.0001
counts=[0,0,0]
from itertools import combinations
for s in d.students:
    exams=[e for e in m.exam_ids if s.id in m.students_per_exam[e]]
    def pairs(assignment):
        return sum(abs((m.slot_dates[x][assignment[x]]-m.slot_dates[y][assignment[y]]).days)<=3 for x,y in combinations(exams,2))
    x,y=pairs(before),pairs(r.summary.assignment)
    counts[0 if y<x else 1 if y==x else 2]+=1
out={'dataset_sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'execution_date':'2026-11-16','parameters':{'algorithm':'local_search','seed':42,'restarts':15},'versions':{'python':platform.python_version(),'numpy':numpy.__version__,'networkx':networkx.__version__,'pydantic':pydantic.__version__},'repeat_same_assignment':True,'initial_assignment':before,'solver':r.summary.model_dump(),'initial_evaluation':a.model_dump(),'optimized_evaluation':b.model_dump(),'student_counts_less_equal_more':counts,'max_incremental_error':r.max_incremental_error,'calendars':[x.model_dump() for x in build_reschedule_explanations(m,before,r.summary.assignment)]}
(repo/'DB/results/evidencia_informe.json').write_text(json.dumps(out,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({k:v for k,v in out.items() if k in ['dataset_sha256','parameters','versions','student_counts_less_equal_more','max_incremental_error']},ensure_ascii=False))
print(r.summary.model_dump(exclude={'assignment','convergence_trace'}))
print('initial',a.total_objective_f,a.feasibility.model_dump(),'optimized',b.total_objective_f,b.feasibility.model_dump())

