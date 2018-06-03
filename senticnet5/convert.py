"""
File to convert the senticnet5 python array of values
to a JSON file
"""
import json 
import copy
import sys
from senticnet5 import * # the senticnet5 python array 

# make a direct json copy of the senticnet5 array
with open('senticnet5.json', 'w') as outfile:
    json.dump(senticnet, outfile)

    senticnet5_smaller = copy.deepcopy(senticnet)
# remove the following from the senticnet5 array:
"""senticnet['concept_name'] = ['pleasantness_value',
                                'attention_value', 
                                'sensitivity_value', <- Remove
                                'aptitude_value', <- Remove
                                'primary_mood', <- Remove
                                'secondary_mood', <- Remove
                                'polarity_label', <- Remove
                                'polarity_value', 
                                'semantics1', <- Remove
                                'semantics2', <- Remove
                                'semantics3', <- Remove
                                'semantics4', <- Remove
                                'semantics5'] <- Remove
                                """
# make an array with fewer values-- remove values above
for word in senticnet5_smaller.values():
    for i in range(0, 5):
        word.pop()
    for j in range(0, 7):
        word.pop(-2)

# make a json copy of the smaller array
with open('senticnet5-smaller.json', 'w') as outfile:
    json.dump(senticnet5_smaller, outfile)

# pretty print files given argument 
print(str(sys.argv))
if str(sys.argv[1]) == "prettyprint":
    obj = None
    with open('senticnet5.json') as source:
        obj = json.load(source)
        outfile = open('senticnet5.json', 'w')
        outfile.write(json.dumps(obj, indent=4, sort_keys=True))
        outfile.close()

        with open('senticnet5-smaller.json') as source:
            obj = json.load(source)
            outfile = open('senticnet5-smaller.json', 'w')
            outfile.write(json.dumps(obj, indent=4, sort_keys=True))
            outfile.close()
