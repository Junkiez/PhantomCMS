import {useEffect, useState, useRef} from "react";

export function PhantomCMS(storage, db) {

    this.getContent = async function (key) {
        return await storage[key];
    }

    this.useContent = function (key) {
        const [data, setData] = useState(null);

        useEffect(() => {
            (async ()=>{
                try {
                    setData(await storage.getItem(key));
                } catch (e) {
                    console.error(e);
                }
            })();
        },[])

        return {data}
    }

    function areObjectsEqual(obj1, obj2) {
        const keys1 = Object.keys(obj1);
        const keys2 = Object.keys(obj2);

        if (keys1.length !== keys2.length) {
            return false;
        }

        for (const key of keys1) {
            if (!keys2.includes(key)) {
                return false;
            }

            if (typeof obj1[key] === 'object' && typeof obj2[key] === 'object') {
                if (!areObjectsEqual(obj1[key], obj2[key])) {
                    return false;
                }
            }
        }

        return true;
    }

    function getValueByPath(obj, path) {
        const keys = path.split('.');
        let value = obj;

        for (const key of keys) {
            if (value && typeof value === 'object' && key in value) {
                value = value[key];
            } else {
                return undefined;
            }
        }

        return value;
    }

    function setValueByPath(obj, path, newValue) {
        const keys = path.split('.');
        let current = obj;

        for (let i = 0; i < keys.length - 1; i++) {
            const key = keys[i];
            if (!current[key] || typeof current[key] !== 'object') {
                current[key] = {};
            }
            current = current[key];
        }

        current[keys[keys.length - 1]] = newValue;
    }

    this.useFantomEdit = function (key) {
        const [editable, setEditable] = useState(false);
        const [content, setContent] = useState(null);
        const [data, setData] = useState(db[key]);
        const inJsx = useRef(null);

        useEffect(() => {
            (async () => {
                const prevData = await storage.getItem(key);
                if (prevData && areObjectsEqual(prevData, db[key])) {
                    setData(prevData);
                    setContent(prevData);
                } else {
                    setContent(db[key]);
                }
            })()
        }, []);

        const addXPathToObjectValues = (obj, currentPath = '') => {
            for (const key in obj) {
                if (obj.hasOwnProperty(key)) {
                    const value = obj[key];
                    const newPath = currentPath === '' ? key : `${currentPath}.${key}`;

                    if (typeof value === 'object' && value !== null) {
                        addXPathToObjectValues(value, newPath);
                    } else {
                        obj[key] = <p contentEditable="plaintext-only" onBlur={e => {
                            const clearCopy = JSON.parse(JSON.stringify(content));
                            setValueByPath(clearCopy, newPath, e.target.innerHTML);
                            setContent(clearCopy);
                        }}>{getValueByPath(content, newPath)}</p>;
                    }
                }
            }
            return obj;
        }

        const memoWrapper = () => {
            if (inJsx.current) {
                return inJsx.current;
            }
            return inJsx.current = addXPathToObjectValues(JSON.parse(JSON.stringify(content)));
        }

        useEffect(() => {
            (async () => {
                if (editable) {
                    setData(memoWrapper());
                } else {
                    if (content) {
                        await storage.setItem(key, content);
                        setData(content);
                    }
                }
            })()
        }, [editable]);


        return [data, editable, setEditable];
    }

}
