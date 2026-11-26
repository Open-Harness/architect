# Throwaway. Compares the two sources' overlapping figures. python3 -I calc/compare.py <scratch-dir>/src
import json, yaml, sys
from decimal import Decimal as D
root=sys.argv[1]
nk=json.load(open(f'{root}/nk/data/tax/2026/state-income-tax.json'))['states']
ow=lambda p: yaml.safe_load(open(f'{root}/ow/data/us/{p}'))
def owb(lst): return [(D(r['over']),D(r.get('base','0')),D(r['rate'])) for r in lst]
def nkb(lst): return [(D(str(a)),D(str(b)),D(str(c))) for a,b,c in lst]
def same(name,a,b):
    print(('OK  ' if a==b else 'DIFF'), name, '' if a==b else f'\n   ow={a}\n   nk={b}')
# federal
f=ow('federal/2026/withholding.yaml')['params']; n=json.load(open(f'{root}/nk/data/tax/2026/federal.json'))
m={'married_joint':'married_jointly','single':'single','head_of_household':'head_of_household'}
for o,k in m.items():
    same(f'fed std {o}', owb(f['brackets']['standard'][o]), nkb(n['brackets']['standard'][k]))
    same(f'fed step2 {o}', owb(f['brackets']['step2_checkbox'][o]), nkb(n['brackets']['higher'][k]))
    same(f'fed adj {o}', D(f['wage_adjustment'][o]), D(str(n['standardDeductionAdjustment'][k])))
fi=ow('federal/2026/fica.yaml')['params']; nf=json.load(open(f'{root}/nk/data/tax/2026/fica.json'))
print('fica ow', fi); print('fica nk', nf['socialSecurity'], nf['medicare'])
# CA annual
c=ow('ca/2026/withholding.yaml')['params']; e=nk['CA'][0]
print('ca ow bracket keys', list(c['brackets']))
cb=c['brackets']
for o,k in {'single':'single','married':'married_jointly','head_of_household':'head_of_household'}.items():
    ob=cb['annually'][o]
    same(f'CA annual {o}', owb(ob), nkb(e['brackets'][k]))
print('CA credit ow annual', c['exemption_allowance']['annually'][:3], 'nk', e['creditPerAllowance'])
print('CA lowinc ow', c['low_income_exemption']['annually'], 'nk', e['lowIncomeExemption'])
# NY
y=ow('ny/2026/withholding.yaml')['params']; e=nk['NY'][0]
for per in ['weekly','biweekly','semimonthly','monthly']:
    for o,k in {'single':'single','married':'married_jointly'}.items():
        same(f'NY {per} {o}', owb(y['brackets'][per][o]), nkb(e['bracketsPerPeriod'][per][k]))
        same(f'NY ded {per} {o}', D(y['deduction'][per][o]), D(str(e['deductionPerPeriod'][per][k])))
    same(f'NY exval {per}', D(y['exemption_value'][per]), D(str(e['exemptionPerAllowancePerPeriod'][per])))
for o,k in {'single':'single','married':'married_jointly'}.items():
    same(f'NY annual {o}', owb(y['brackets']['annually'][o]), nkb(e['brackets'][k]))
print('NY method iii ow', str(y['method_iii_cutover'])[:300], str(y['method_iii'])[:600]); print('NY nk flatRateAbove', e['flatRateAbove'])
# NJ
j=ow('nj/2020/withholding.yaml')['params']; e=nk['NJ'][0]
print('NJ ow keys', list(j), str(j)[:300])
codes={x['code']:x for x in e['exemptionCodes']}
for code in 'ABCDE':
    for per in ['weekly','biweekly','semimonthly','monthly','annually']:
        try: ob=owb(j['brackets'][per]['rate_'+code.lower()])
        except Exception as ex: ob=f'?{ex}'
        same(f'NJ {code} {per}', ob, nkb(codes[code]['periodBrackets'][per]) if code in codes else None)
