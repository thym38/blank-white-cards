import re

file = open("./cards/card.txt", 'r')
data = file.read()
file.close()

data = data.split("\n\n")
for i in range(len(data)):
    data[i] = data[i].split('\n')

pattern1 = "[a-zA-Z' ]+"
prog1 = re.compile(pattern1)

pattern2 = "^[0-9]* "
prog2 = re.compile(pattern2)

pattern3 = "^-?[0-9]*"
prog3 = re.compile(pattern3)

cards = []

file = open("./cards/result.txt", 'a')
file.write("const data = '[")

maxdesc = 0
maxname = 0

for i in range(len(data)):
    data[i].insert(1, data[i].pop())

    res1 = prog1.search(data[i][0])
    if res1 is not None:
        data[i].insert(1, res1[0].strip())

    res2 = prog2.match(data[i][0])
    if res2 is not None:
        data[i][0] = int(res2[0])

    if data[i][2][:6] == "Value:":
        data[i][2] = data[i][2][7:]
        res3 = prog3.match(data[i][2])
        if res3 is not None:
            data[i][2] = int(res3[0])

    if len(data[i]) > 4:
        for j in range(4,len(data[i])):
            data[i][3] = data[i][3] + data[i][j]
        data[i] = data[i][:4]

    string ='{"id":'+str(data[i][0])+', "name": "'+str(data[i][1])+'", "value": '+str(data[i][2])+', "descr": "'+str(data[i][3])+'"},'
    file.write(string)

    if len(data[i][3]) > maxdesc:
        maxdesc = len(data[i][3])

    if len(data[i][1]) > maxname:
        maxname = len(data[i][1])

file.write(']')
file.write("]'\n\nmodule.exports = data;")
file.close()

print("desc: {} name: {}".format(maxdesc,maxname))